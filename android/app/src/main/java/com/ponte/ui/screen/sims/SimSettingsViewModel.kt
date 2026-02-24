package com.ponte.ui.screen.sims

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ponte.domain.model.ExtraNumber
import com.ponte.domain.model.Sim
import com.ponte.domain.repository.ISimRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SimSettingsViewModel @Inject constructor(
    private val simRepository: ISimRepository
) : ViewModel() {

    data class UiState(
        val sims: List<Sim> = emptyList(),
        val isLoading: Boolean = false,
        val error: String? = null
    )

    val uiState: StateFlow<List<Sim>> = simRepository.observeSims()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _actionState = MutableStateFlow(ActionState())
    val actionState: StateFlow<ActionState> = _actionState.asStateFlow()

    data class ActionState(
        val isLoading: Boolean = false,
        val error: String? = null
    )

    fun updateSim(sim: Sim) {
        viewModelScope.launch {
            _actionState.update { it.copy(isLoading = true) }
            try {
                simRepository.updateSim(sim)
                simRepository.syncSimsToBackend(listOf(sim))
                _actionState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _actionState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun addExtraNumber(simId: String, extraNumber: ExtraNumber) {
        viewModelScope.launch {
            _actionState.update { it.copy(isLoading = true) }
            val result = simRepository.addExtraNumber(simId, extraNumber)
            result.fold(
                onSuccess = { _actionState.update { it.copy(isLoading = false) } },
                onFailure = { e -> _actionState.update { it.copy(isLoading = false, error = e.message) } }
            )
        }
    }

    fun removeExtraNumber(id: String) {
        viewModelScope.launch {
            simRepository.removeExtraNumber(id)
        }
    }

    fun clearError() {
        _actionState.update { it.copy(error = null) }
    }
}
