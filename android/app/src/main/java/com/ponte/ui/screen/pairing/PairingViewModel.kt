package com.ponte.ui.screen.pairing

import android.net.Uri
import android.os.Build
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ponte.data.local.prefs.SecurePrefs
import com.ponte.domain.model.DeviceInfo
import com.ponte.domain.usecase.PairDeviceUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PairingViewModel @Inject constructor(
    private val pairDeviceUseCase: PairDeviceUseCase,
    private val securePrefs: SecurePrefs
) : ViewModel() {

    data class UiState(
        val isLoading: Boolean = false,
        val isPaired: Boolean = false,
        val error: String? = null,
        val scannedToken: String? = null
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    /**
     * Called when QR code is scanned.
     * Expects URI like: ponte://pair?token=<uuid>&server=<encoded_url>
     */
    fun onQrScanned(qrValue: String) {
        if (_uiState.value.isLoading) return

        val uri = try {
            Uri.parse(qrValue)
        } catch (_: Exception) {
            _uiState.update { it.copy(error = "Неверный QR-код") }
            return
        }

        val token = uri.getQueryParameter("token")
        val server = uri.getQueryParameter("server")

        if (token.isNullOrBlank() || server.isNullOrBlank()) {
            _uiState.update { it.copy(error = "Неверный QR-код: отсутствует токен или адрес сервера") }
            return
        }

        // Save server URL (ensure trailing slash for Retrofit)
        val serverUrl = if (server.endsWith("/")) server else "$server/"
        securePrefs.serverUrl = serverUrl

        _uiState.update { it.copy(scannedToken = token, isLoading = true, error = null) }

        viewModelScope.launch {
            val deviceInfo = DeviceInfo(
                name = "${Build.MANUFACTURER} ${Build.MODEL}",
                androidVersion = Build.VERSION.RELEASE
            )

            val result = pairDeviceUseCase(token, deviceInfo)

            _uiState.update { state ->
                result.fold(
                    onSuccess = { state.copy(isLoading = false, isPaired = true) },
                    onFailure = { e ->
                        state.copy(
                            isLoading = false,
                            error = e.message ?: "Ошибка привязки"
                        )
                    }
                )
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}