package com.ponte.domain.model

data class Sim(
    val id: String,
    val subscriptionId: Int = -1,
    val slotIndex: Int,
    val iccId: String,
    val carrierName: String,
    val rawNumber: String?,
    val displayName: String,
    val displayNumber: String?,
    val color: String,
    val isDefault: Boolean,
    val extraNumbers: List<ExtraNumber> = emptyList()
)
