package com.ponte.ui.screen.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ponte.data.remote.ws.WsClient
import com.ponte.domain.repository.IAuthRepository
import com.ponte.service.SyncForegroundService
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val authRepository: IAuthRepository,
    private val wsClient: WsClient
) : ViewModel() {

    data class UiState(
        val isDisconnecting: Boolean = false
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun disconnect(onComplete: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isDisconnecting = true) }

            wsClient.disconnect()
            SyncForegroundService.stop(context)
            authRepository.logout()

            _uiState.update { it.copy(isDisconnecting = false) }
            onComplete()
        }
    }
}
