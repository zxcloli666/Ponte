package com.ponte.domain.model

data class Sms(
    val androidMsgId: String,
    val simId: String,
    val extraNumberId: String?,
    val direction: MessageDirection,
    val address: String,
    val contactId: String?,
    val body: String,
    val createdAt: Long
)

enum class MessageDirection(val value: String) {
    INCOMING("incoming"),
    OUTGOING("outgoing");

    companion object {
        fun fromValue(value: String): MessageDirection =
            entries.first { it.value == value }

        fun fromSmsType(type: Int): MessageDirection =
            if (type == 1) INCOMING else OUTGOING
    }
}
