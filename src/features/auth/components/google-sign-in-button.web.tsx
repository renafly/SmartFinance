import { supabase } from "@/shared/lib/supabase/client";
import {
  CredentialResponse,
  GoogleLogin,
  GoogleOAuthProvider,
} from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import "react-native-get-random-values";

export default function GoogleSignInButton() {
  const [sha256Nonce, setSha256Nonce] = useState("");
  const nonceRef = useRef<string | null>(null);

  async function onGoogleButtonSuccess(
    authRequestResponse: CredentialResponse,
  ) {
    console.debug("[GoogleSignInButton.web] Google sign in successful:", {
      authRequestResponse,
    });
    const rawNonce = nonceRef.current;

    if (!rawNonce || !authRequestResponse.credential) return;

    if (authRequestResponse.clientId && authRequestResponse.credential) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: authRequestResponse.credential,
        nonce: rawNonce,
      });

      if (error) {
        console.error(
          "[GoogleSignInButton.web] Error signing in with Google:",
          error,
        );
      }

      if (data) {
        console.log(
          "[GoogleSignInButton.web] Google sign in successful:",
          data,
        );
      }
    }
  }

  function onGoogleButtonFailure() {
    console.error("[GoogleSignInButton.web] Error signing in with Google");
  }

  useEffect(() => {
    if (nonceRef.current) return;

    function generateNonce(): string {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0].toString();
    }

    async function generateSha256Nonce(value: string): Promise<string> {
      const buffer = await window.crypto.subtle.digest(
        "sha-256",
        new TextEncoder().encode(value),
      );
      const array = Array.from(new Uint8Array(buffer));
      return array.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    const value = generateNonce();
    nonceRef.current = value;

    generateSha256Nonce(value).then((value) => setSha256Nonce(value));
  }, []);

  return (
    <GoogleOAuthProvider
      clientId={process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ""}
      nonce={sha256Nonce}
    >
      <View style={{ alignSelf: "flex-start" }}>
        <GoogleLogin
          type="standard"
          theme="outline"
          size="large"
          text="signin_with"
          shape="rectangular"
          logo_alignment="left"
          nonce={sha256Nonce}
          onSuccess={onGoogleButtonSuccess}
          onError={onGoogleButtonFailure}
          useOneTap={false}
          auto_select={false}
        />
      </View>
    </GoogleOAuthProvider>
  );
}
