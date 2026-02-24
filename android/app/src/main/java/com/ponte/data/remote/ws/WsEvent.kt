package com.ponte.data.remote.ws

sealed class WsEvent {
    // Outgoing events (Android -> Backend)
    data class SmsPush(val payload: String) : WsEvent()
    data class CallLogPush(val payload: String) : WsEvent()
    data class NotificationPush(val payload: String) : WsEvent()
    data class ContactSync(val payload: String) : WsEvent()
    data class SyncRequest(val lastAckedEventId: String?) : WsEvent()

    // Incoming events (Backend -> Android)
    data class SmsSend(val payload: String) : WsEvent()
    data class CallInitiate(val payload: String) : WsEvent()
    data class CallAccept(val payload: String) : WsEvent()
    data class CallReject(val payload: String) : WsEvent()
    data class CallEnd(val payload: String) : WsEvent()
    data class Ack(val androidId: String, val eventType: String) : WsEvent()

    // Connection lifecycle
    data object Connected : WsEvent()
    data object Disconnected : WsEvent()
    data class Error(val throwable: Throwable) : WsEvent()
    data object Reconnecting : WsEvent()
    data object TokenExpired : WsEvent()

    val eventName: String
        get() = when (this) {
            is SmsPush -> "sms:push"
            is CallLogPush -> "call:log:push"
            is NotificationPush -> "notification:push"
            is ContactSync -> "contacts:sync"
            is SyncRequest -> "sync:request"
            is SmsSend -> "sms:send"
            is CallInitiate -> "call:initiate"
            is CallAccept -> "call:accept"
            is CallReject -> "call:reject"
            is CallEnd -> "call:end"
            is Ack -> "ack"
            is Connected -> "connect"
            is Disconnected -> "disconnect"
            is Error -> "error"
            is Reconnecting -> "reconnecting"
            is TokenExpired -> "token_expired"
        }
}