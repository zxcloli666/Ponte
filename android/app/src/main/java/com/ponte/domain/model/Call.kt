package com.ponte.domain.model

data class Call(
    val androidCallId: String,
    val simId: String,
    val extraNumberId: String?,
    val direction: CallDirection,
    val address: String,
    val contactId: String?,
    val duration: Int,
    val startedAt: Long,
    val endedAt: Long?
)

enum class CallDirection(val value: String) {
    INCOMING("incoming"),
    OUTGOING("outgoing"),
    MISSED("missed");

    companion object {
        fun fromValue(value: String): CallDirection =
            entries.first { it.value == value }

        fun fromCallLogType(type: Int): CallDirection = when (type) {
            1 -> INCOMING
            2 -> OUTGOING
            else -> MISSED
        }
    }
}
