package com.ponte.ui.navigation

import androidx.lifecycle.ViewModel
import com.ponte.data.local.prefs.SecurePrefs
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class NavViewModel @Inject constructor(
    val securePrefs: SecurePrefs
) : ViewModel()
