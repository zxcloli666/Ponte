package com.ponte.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.ponte.data.local.prefs.SecurePrefs
import com.ponte.service.SyncForegroundService
import com.ponte.ui.screen.dashboard.DashboardScreen
import com.ponte.ui.screen.notifications.NotificationFiltersScreen
import com.ponte.ui.screen.pairing.PairingScreen
import com.ponte.ui.screen.permissions.PermissionsScreen
import com.ponte.ui.screen.settings.SettingsScreen
import com.ponte.ui.screen.sims.SimSettingsScreen

@Composable
fun PonteNavHost(
    navController: NavHostController = rememberNavController(),
    securePrefs: SecurePrefs = hiltViewModel<NavViewModel>().securePrefs
) {
    val startDestination = if (securePrefs.isPaired) Route.Dashboard.path else Route.Pairing.path

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Route.Pairing.path) {
            PairingScreen(
                onPaired = {
                    navController.navigate(Route.Permissions.path) {
                        popUpTo(Route.Pairing.path) { inclusive = true }
                    }
                }
            )
        }

        composable(Route.Permissions.path) {
            val context = androidx.compose.ui.platform.LocalContext.current
            PermissionsScreen(
                onAllGranted = {
                    SyncForegroundService.start(context)
                    navController.navigate(Route.Dashboard.path) {
                        popUpTo(Route.Permissions.path) { inclusive = true }
                    }
                }
            )
        }

        composable(Route.Dashboard.path) {
            // Ensure sync service is running when dashboard opens
            val context = androidx.compose.ui.platform.LocalContext.current
            androidx.compose.runtime.LaunchedEffect(Unit) {
                SyncForegroundService.start(context)
            }
            DashboardScreen(
                onNavigateToSims = { navController.navigate(Route.SimSettings.path) },
                onNavigateToNotifications = { navController.navigate(Route.NotificationFilters.path) },
                onNavigateToSettings = { navController.navigate(Route.Settings.path) }
            )
        }

        composable(Route.SimSettings.path) {
            SimSettingsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Route.NotificationFilters.path) {
            NotificationFiltersScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Route.Settings.path) {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onDisconnect = {
                    navController.navigate(Route.Pairing.path) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}