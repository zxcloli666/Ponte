package com.ponte.domain.model

data class AppNotification(
    val androidNotifId: String,
    val packageName: String,
    val appName: String,
    val title: String,
    val body: String,
    val postedAt: Long
)
