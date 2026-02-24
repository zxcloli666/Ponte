package com.ponte.domain.model

data class OutboxMessage(
    val id: Long = 0,
    val eventType: String,
    val payload: String,
    val androidId: String,
    val attempts: Int = 0,
    val nextRetryAt: Long = 0,
    val status: OutboxStatus = OutboxStatus.PENDING,
    val createdAt: Long = System.currentTimeMillis()
)

enum class OutboxStatus(val value: String) {
    PENDING("pending"),
    SENT("sent"),
    ACKED("acked");

    companion object {
        fun fromValue(value: String): OutboxStatus =
            entries.first { it.value == value }
    }
}
