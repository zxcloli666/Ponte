package com.ponte.ui.screen.sims

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ponte.domain.model.ExtraNumber
import com.ponte.ui.component.SimBadge

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SimSettingsScreen(
    onBack: () -> Unit,
    viewModel: SimSettingsViewModel = hiltViewModel()
) {
    val sims by viewModel.uiState.collectAsState()
    var showAddDialogForSimId by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("SIM-карты") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(sims, key = { it.id }) { sim ->
                SimCard(
                    sim = sim,
                    onRemoveExtraNumber = { viewModel.removeExtraNumber(it) },
                    onAddExtraNumber = { showAddDialogForSimId = sim.id }
                )
            }

            if (sims.isEmpty()) {
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "SIM-карты не обнаружены",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "SIM-карты определяются автоматически при запуске сервиса.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }

    showAddDialogForSimId?.let { simId ->
        AddExtraNumberDialog(
            onDismiss = { showAddDialogForSimId = null },
            onConfirm = { extra ->
                viewModel.addExtraNumber(simId, extra)
                showAddDialogForSimId = null
            }
        )
    }
}

@Composable
private fun AddExtraNumberDialog(
    onDismiss: () -> Unit,
    onConfirm: (ExtraNumber) -> Unit
) {
    var prefix by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }

    val isValid = prefix.isNotBlank() && phoneNumber.isNotBlank() && displayName.isNotBlank()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Добавить доп. номер") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Оператор добавляет префикс к номеру звонящего. " +
                        "Например, если префикс \"10\", то +79991234567 приходит как 1079991234567.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                OutlinedTextField(
                    value = prefix,
                    onValueChange = { prefix = it.take(4) },
                    label = { Text("Префикс (напр. 10, 20)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = phoneNumber,
                    onValueChange = { phoneNumber = it },
                    label = { Text("Номер телефона") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = displayName,
                    onValueChange = { displayName = it },
                    label = { Text("Название (напр. Рабочий)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onConfirm(
                        ExtraNumber(
                            id = "",
                            simId = "",
                            prefix = prefix.trim(),
                            phoneNumber = phoneNumber.trim(),
                            displayName = displayName.trim(),
                            displayNumber = phoneNumber.trim(),
                            color = "#FF9800",
                            sortOrder = 0
                        )
                    )
                },
                enabled = isValid
            ) {
                Text("Добавить")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Отмена")
            }
        }
    )
}

@Composable
private fun SimCard(
    sim: com.ponte.domain.model.Sim,
    onRemoveExtraNumber: (String) -> Unit,
    onAddExtraNumber: () -> Unit
) {
    val cardColor = try {
        Color(android.graphics.Color.parseColor(sim.color)).copy(alpha = 0.08f)
    } catch (_: Exception) {
        MaterialTheme.colorScheme.surfaceVariant
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = cardColor)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                SimBadge(name = sim.displayName, color = sim.color)
                Text(
                    text = "Слот ${sim.slotIndex + 1}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = sim.displayNumber ?: sim.rawNumber ?: "Нет номера",
                style = MaterialTheme.typography.bodyLarge
            )
            Text(
                text = sim.carrierName,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // Extra numbers section
            if (sim.extraNumbers.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Дополнительные номера",
                    style = MaterialTheme.typography.titleSmall
                )
                Spacer(modifier = Modifier.height(8.dp))
                sim.extraNumbers.forEach { extra ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                SimBadge(name = extra.displayName, color = extra.color)
                                Text(
                                    text = "Префикс: ${extra.prefix}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = extra.displayNumber,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                        IconButton(onClick = { onRemoveExtraNumber(extra.id) }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "Удалить",
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            }

            // Add extra number button
            Spacer(modifier = Modifier.height(8.dp))
            TextButton(onClick = onAddExtraNumber) {
                Icon(Icons.Default.Add, contentDescription = null)
                Text("Добавить доп. номер", modifier = Modifier.padding(start = 4.dp))
            }
        }
    }
}
