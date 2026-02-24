package com.ponte.ui.screen.notifications

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ponte.domain.repository.INotificationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationFiltersViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val notificationRepository: INotificationRepository
) : ViewModel() {

    data class AppFilter(
        val packageName: String,
        val appName: String,
        val enabled: Boolean
    )

    data class UiState(
        val apps: List<AppFilter> = emptyList(),
        val filteredApps: List<AppFilter> = emptyList(),
        val searchQuery: String = "",
        val isLoading: Boolean = true
    )

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        loadApps()
    }

    private fun loadApps() {
        viewModelScope.launch {
            val pm = context.packageManager
            val installedApps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
                .filter { it.flags and ApplicationInfo.FLAG_SYSTEM == 0 }
                .sortedBy { pm.getApplicationLabel(it).toString().lowercase() }

            val filters = notificationRepository.getAllFilters().toMap()

            val apps = installedApps.map { appInfo ->
                AppFilter(
                    packageName = appInfo.packageName,
                    appName = pm.getApplicationLabel(appInfo).toString(),
                    enabled = filters[appInfo.packageName] ?: false
                )
            }

            _uiState.update {
                it.copy(
                    apps = apps,
                    filteredApps = apps,
                    isLoading = false
                )
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.update { state ->
            val filtered = if (query.isBlank()) {
                state.apps
            } else {
                state.apps.filter {
                    it.appName.contains(query, ignoreCase = true) ||
                    it.packageName.contains(query, ignoreCase = true)
                }
            }
            state.copy(searchQuery = query, filteredApps = filtered)
        }
    }

    fun onToggle(packageName: String, enabled: Boolean) {
        viewModelScope.launch {
            notificationRepository.setPackageEnabled(packageName, enabled)

            _uiState.update { state ->
                val updatedApps = state.apps.map {
                    if (it.packageName == packageName) it.copy(enabled = enabled) else it
                }
                val updatedFiltered = state.filteredApps.map {
                    if (it.packageName == packageName) it.copy(enabled = enabled) else it
                }
                state.copy(apps = updatedApps, filteredApps = updatedFiltered)
            }
        }
    }
}
