package com.ponte.ui.navigation

sealed class Route(val path: String) {
    data object Pairing : Route("pairing")
    data object Permissions : Route("permissions")
    data object Dashboard : Route("dashboard")
    data object SimSettings : Route("sims")
    data object NotificationFilters : Route("notifications")
    data object Settings : Route("settings")
}
