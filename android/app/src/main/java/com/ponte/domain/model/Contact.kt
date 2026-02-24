package com.ponte.domain.model

data class Contact(
    val androidId: String,
    val name: String,
    val phones: List<ContactPhone>,
    val photoBase64: String?,
    val updatedAt: Long
)

data class ContactPhone(
    val number: String,
    val type: String,
    val label: String
)
