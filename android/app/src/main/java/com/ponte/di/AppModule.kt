package com.ponte.di

import android.content.Context
import androidx.room.Room
import com.ponte.data.local.db.PonteDatabase
import com.ponte.data.local.db.dao.ExtraNumberDao
import com.ponte.data.local.db.dao.NotificationFilterDao
import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.data.local.db.dao.SimDao
import com.ponte.data.local.db.dao.SyncStateDao
import com.ponte.data.repository.AuthRepository
import com.ponte.data.repository.CallRepository
import com.ponte.data.repository.ContactRepository
import com.ponte.data.repository.NotificationRepository
import com.ponte.data.repository.SimRepository
import com.ponte.data.repository.SmsRepository
import com.ponte.domain.repository.IAuthRepository
import com.ponte.domain.repository.ICallRepository
import com.ponte.domain.repository.IContactRepository
import com.ponte.domain.repository.INotificationRepository
import com.ponte.domain.repository.ISimRepository
import com.ponte.domain.repository.ISmsRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): PonteDatabase {
        return Room.databaseBuilder(
            context,
            PonteDatabase::class.java,
            PonteDatabase.NAME
        ).fallbackToDestructiveMigration().build()
    }

    @Provides
    fun provideOutboxDao(db: PonteDatabase): OutboxDao = db.outboxDao()

    @Provides
    fun provideSimDao(db: PonteDatabase): SimDao = db.simDao()

    @Provides
    fun provideExtraNumberDao(db: PonteDatabase): ExtraNumberDao = db.extraNumberDao()

    @Provides
    fun provideNotificationFilterDao(db: PonteDatabase): NotificationFilterDao = db.notificationFilterDao()

    @Provides
    fun provideSyncStateDao(db: PonteDatabase): SyncStateDao = db.syncStateDao()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepository): IAuthRepository

    @Binds
    @Singleton
    abstract fun bindSmsRepository(impl: SmsRepository): ISmsRepository

    @Binds
    @Singleton
    abstract fun bindCallRepository(impl: CallRepository): ICallRepository

    @Binds
    @Singleton
    abstract fun bindNotificationRepository(impl: NotificationRepository): INotificationRepository

    @Binds
    @Singleton
    abstract fun bindContactRepository(impl: ContactRepository): IContactRepository

    @Binds
    @Singleton
    abstract fun bindSimRepository(impl: SimRepository): ISimRepository
}
