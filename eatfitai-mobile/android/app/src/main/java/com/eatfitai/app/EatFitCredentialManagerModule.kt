package com.eatfitai.app

import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class EatFitCredentialManagerModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

  override fun getName(): String = "EatFitCredentialManager"

  @ReactMethod
  fun signIn(webClientId: String, promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("credential_missing_activity", "No active Android activity for Google sign-in.")
      return
    }

    if (webClientId.isBlank()) {
      promise.reject("credential_invalid_config", "Google web client ID is missing.")
      return
    }

    scope.launch {
      try {
        val credentialManager = CredentialManager.create(reactContext)
        val signInWithGoogleOption = GetSignInWithGoogleOption.Builder(webClientId).build()
        val request = GetCredentialRequest.Builder()
          .addCredentialOption(signInWithGoogleOption)
          .build()
        val result = credentialManager.getCredential(
          context = activity,
          request = request,
        )

        promise.resolve(toMap(extractGoogleCredential(result)))
      } catch (error: GetCredentialCancellationException) {
        promise.reject("credential_cancelled", "Google sign-in was cancelled.", error)
      } catch (error: NoCredentialException) {
        promise.reject("credential_no_credential", "No Google credential is available.", error)
      } catch (error: GoogleIdTokenParsingException) {
        promise.reject("credential_invalid_token", "Google returned an invalid ID token.", error)
      } catch (error: GetCredentialException) {
        promise.reject("credential_unavailable", error.message ?: "Credential Manager failed.", error)
      } catch (error: Exception) {
        promise.reject("credential_unknown", error.message ?: "Credential Manager failed.", error)
      }
    }
  }

  @ReactMethod
  fun clearCredentialState(promise: Promise) {
    scope.launch {
      try {
        CredentialManager.create(reactContext).clearCredentialState(ClearCredentialStateRequest())
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("credential_clear_failed", error.message ?: "Could not clear credential state.", error)
      }
    }
  }

  override fun invalidate() {
    scope.cancel()
    super.invalidate()
  }

  private fun extractGoogleCredential(result: GetCredentialResponse): GoogleIdTokenCredential {
    val credential = result.credential
    if (
      credential is CustomCredential &&
      credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
    ) {
      return GoogleIdTokenCredential.createFrom(credential.data)
    }

    throw IllegalStateException("Unexpected credential type: ${credential.type}")
  }

  private fun toMap(credential: GoogleIdTokenCredential): WritableMap {
    val user = Arguments.createMap().apply {
      putString("id", credential.id)
      putString("email", credential.id)
      putString("name", credential.displayName)
      putString("photo", credential.profilePictureUri?.toString())
    }

    return Arguments.createMap().apply {
      putString("idToken", credential.idToken)
      putMap("user", user)
    }
  }
}
