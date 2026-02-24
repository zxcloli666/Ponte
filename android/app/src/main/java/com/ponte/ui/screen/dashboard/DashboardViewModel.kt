package com.ponte.ui.screen.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.data.remote.ws.WsClient
import com.ponte.domain.model.Sim
import com.ponte.domain.repository.ISimRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val wsClient: WsClient,
    private val simRepository: ISimRepository,
    private val outboxDao: OutboxDao
) : ViewModel() {

    data class UiState(
        val connectionState: WsClient.ConnectionState = WsClient.ConnectionState.DISCONNECTED,
        val sims: List<Sim> = emptyList(),
        val pendingOutbox: Int = 0
    )

    val uiState: StateFlow<UiState> = combine(
        wsClient.connectionState,
        simRepository.observeSims(),
        outboxDao.observePendingCount()
    ) { connection, sims, pending ->
        UiState(
            connectionState = connection,
            sims = sims,
            pendingOutbox = pending
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = UiState()
    )
}
