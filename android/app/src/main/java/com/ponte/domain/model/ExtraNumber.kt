package com.ponte.domain.model

data class ExtraNumber(
    val id: String,
    val simId: String,
    val prefix: String,
    val phoneNumber: String,
    val displayName: String,
    val displayNumber: String,
    val color: String,
    val sortOrder: Int
)
