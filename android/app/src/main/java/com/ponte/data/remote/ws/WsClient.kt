package com.ponte.data.remote.ws

import com.ponte.data.local.prefs.SecurePrefs
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.engineio.client.transports.WebSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URI
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.min

@Singleton
class WsClient @Inject constructor(
    private val securePrefs: SecurePrefs
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var socket: Socket? = null
    private var reconnectAttempt = 0

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _events = MutableSharedFlow<WsEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<WsEvent> = _events.asSharedFlow()

    fun connect() {
        val serverUrl = securePrefs.serverUrl ?: return
        val token = securePrefs.accessToken ?: return

        if (socket?.connected() == true) return

        disconnect()

        // serverUrl is like "http://host:3000/v1/" — strip path to get WS root, add /ws namespace
        val uri = URI.create(serverUrl)
        val wsRoot = "${uri.scheme}://${uri.host}${if (uri.port > 0) ":${uri.port}" else ""}"

        val options = IO.Options().apply {
            transports = arrayOf(WebSocket.NAME)
            auth = mapOf("token" to token)
            reconnection = false // we handle reconnection manually
            forceNew = true
        }

        socket = IO.socket(URI.create("$wsRoot/ws"), options).apply {
            on(Socket.EVENT_CONNECT) {
                reconnectAttempt = 0
                _connectionState.value = ConnectionState.CONNECTED
                scope.launch { _events.emit(WsEvent.Connected) }
            }

            on(Socket.EVENT_DISCONNECT) {
                _connectionState.value = ConnectionState.DISCONNECTED
                scope.launch { _events.emit(WsEvent.Disconnected) }
                scheduleReconnect()
            }

            on(Socket.EVENT_CONNECT_ERROR) { args ->
                val error = args.firstOrNull()
                if (error is Exception && error.message?.contains("401") == true) {
                    scope.launch { _events.emit(WsEvent.TokenExpired) }
                } else {
                    scope.launch {
                        _events.emit(WsEvent.Error(
                            error as? Throwable ?: RuntimeException("Connection error")
                        ))
                    }
                    scheduleReconnect()
                }
            }

            on("sms:send") { args ->
                args.firstOrNull()?.let { data ->
                    scope.launch { _events.emit(WsEvent.SmsSend(data.toString())) }
                }
            }

            on("call:initiate") { args ->
                args.firstOrNull()?.let { data ->
                    scope.launch { _events.emit(WsEvent.CallInitiate(data.toString())) }
                }
            }

            on("call:accept") { args ->
                args.firstOrNull()?.let { data ->
                    scope.launch { _events.emit(WsEvent.CallAccept(data.toString())) }
                }
            }

            on("call:reject") { args ->
                args.firstOrNull()?.let { data ->
                    scope.launch { _events.emit(WsEvent.CallReject(data.toString())) }
                }
            }

            on("call:end") { args ->
                args.firstOrNull()?.let { data ->
                    scope.launch { _events.emit(WsEvent.CallEnd(data.toString())) }
                }
            }

            // Backend sends typed ack events: sms:ack, call:log:ack, notification:ack, contacts:ack
            // Each contains { ids: [androidId, ...] }
            val ackEvents = mapOf(
                "sms:ack" to "sms",
                "call:log:ack" to "call",
                "notification:ack" to "notification",
                "contacts:ack" to "contact"
            )
            for ((eventName, eventType) in ackEvents) {
                on(eventName) { args ->
                    args.firstOrNull()?.let { data ->
                        val json = JSONObject(data.toString())
                        val ids = json.optJSONArray("ids") ?: return@let
                        scope.launch {
                            for (i in 0 until ids.length()) {
                                _events.emit(WsEvent.Ack(
                                    androidId = ids.getString(i),
                                    eventType = eventType
                                ))
                            }
                        }
                    }
                }
            }

            connect()
        }
    }

    fun disconnect() {
        socket?.off()
        socket?.disconnect()
        socket = null
        _connectionState.value = ConnectionState.DISCONNECTED
    }

    fun emit(event: WsEvent, payload: JSONObject, ackCallback: ((Array<Any>) -> Unit)? = null) {
        val s = socket ?: return
        if (!s.connected()) return

        if (ackCallback != null) {
            s.emit(event.eventName, payload, io.socket.client.Ack { args ->
                ackCallback(args)
            })
        } else {
            s.emit(event.eventName, payload)
        }
    }

    fun emit(eventName: String, payload: JSONObject) {
        val s = socket ?: return
        if (!s.connected()) return
        s.emit(eventName, payload)
    }

    fun updateToken(newToken: String) {
        securePrefs.accessToken = newToken
        if (_connectionState.value == ConnectionState.CONNECTED) {
            disconnect()
            connect()
        }
    }

    private fun scheduleReconnect() {
        scope.launch {
            _connectionState.value = ConnectionState.RECONNECTING
            _events.emit(WsEvent.Reconnecting)

            val delayMs = calculateBackoff(reconnectAttempt)
            reconnectAttempt++

            delay(delayMs)
            connect()
        }
    }

    private fun calculateBackoff(attempt: Int): Long {
        val baseDelay = 1000L
        val maxDelay = 30_000L
        val delay = baseDelay * (1L shl min(attempt, 14))
        return min(delay, maxDelay)
    }

    enum class ConnectionState {
        CONNECTED,
        DISCONNECTED,
        RECONNECTING
    }
}
