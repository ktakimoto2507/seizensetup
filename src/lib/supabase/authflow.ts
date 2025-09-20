// src/lib/supabase/authflow.ts
import { supabase } from "./client";

/** email+password を保証（未登録なら signUp、登録済なら signIn） */
export async function ensureEmailAuth(email: string, password: string) {
  // すでにログインしていれば何もしない
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.email) return session;

  // まず signIn。失敗（Invalid login）のときは signUp を試す。
  const trySignIn = await supabase.auth.signInWithPassword({ email, password });
  if (!trySignIn.error) return trySignIn.data.session;

  const trySignUp = await supabase.auth.signUp({ email, password });
  if (trySignUp.error) throw trySignUp.error;

  // 確認メールが OFF ならここで session が返ります。ON の場合は null。
  return trySignUp.data.session;
}
