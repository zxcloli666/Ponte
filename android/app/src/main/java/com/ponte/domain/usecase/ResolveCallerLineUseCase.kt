package com.ponte.domain.usecase

import com.ponte.domain.model.ExtraNumber
import com.ponte.domain.repository.ISimRepository
import javax.inject.Inject

/**
 * Resolves which line (main SIM or extra number) a call/SMS belongs to by
 * decoding the prefix from the caller ID.
 *
 * Operator multi-number services (e.g. Megafon "Multinumber") prefix the caller ID
 * with a 2-digit code: "20" + real_number. This use case strips the prefix and
 * returns the matched ExtraNumber, or null if the caller ID is not prefixed.
 */
class ResolveCallerLineUseCase @Inject constructor(
    private val simRepository: ISimRepository
) {
    data class Resolution(
        val extraNumber: ExtraNumber?,
        val decodedAddress: String
    )

    suspend operator fun invoke(simId: String, rawAddress: String): Resolution {
        if (rawAddress.length < 3) {
            return Resolution(extraNumber = null, decodedAddress = rawAddress)
        }

        val extras = simRepository.getExtraNumbersForSim(simId)
        if (extras.isEmpty()) {
            return Resolution(extraNumber = null, decodedAddress = rawAddress)
        }

        val prefix = rawAddress.take(2)
        val matched = extras.find { it.prefix == prefix }

        return if (matched != null) {
            Resolution(
                extraNumber = matched,
                decodedAddress = rawAddress.drop(2)
            )
        } else {
            Resolution(extraNumber = null, decodedAddress = rawAddress)
        }
    }
}
