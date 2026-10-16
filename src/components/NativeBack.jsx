import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * The phone's own back button, handed back to the app.
 *
 * On a phone the app stands inside a native shell, and a press of the back button is a word to that
 * shell rather than a step through the app: left alone, the first press closes the whole window, whichever
 * screen the person was standing on. So the press is caught here and made to walk the app's own history
 * backwards — exactly as the browser's own back does — and one step is kept in front of the app's first
 * screen, so that even from the home screen the press is taken by the app instead of throwing the person
 * out of it.
 *
 * On the plain web nothing here runs at all: the browser already walks its own history that way.
 */

/** Whether the app is standing inside a native shell that sends the back button to it. */
function inNativeShell() {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.Capacitor?.isNativePlatform?.() ||
      window.ReactNativeWebView ||
      window.__BABEMBE_NATIVE__ ||
      /\bwv\b/.test(window.navigator?.userAgent || "")
  );
}

export default function NativeBack() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!inNativeShell()) return undefined;

    /** Where the app stands in the browser's own history: the first screen stands at nothing. */
    const depth = () => {
      const idx = window.history?.state?.idx;
      return typeof idx === "number" ? idx : 0;
    };

    /** One step kept in front of the app, so a press of back is caught by the app and not by the shell. */
    const keepStep = () => {
      if (depth() !== 0 || window.history.state?.appBackStep) return;
      window.history.pushState(
        { ...(window.history.state || {}), idx: 1, appBackStep: true },
        "",
        window.location.href
      );
    };

    /** A press of the phone's back button: one step back through the app, where there is one. */
    const goBack = () => {
      keepStep();
      if (depth() > 0) navigate(-1);
    };

    // a press that spent the kept step puts it back, so the app never stands at the very edge of its
    // own history with the next press falling straight out of it
    const onPop = () => {
      if (depth() === 0) window.setTimeout(keepStep, 0);
    };

    // the shell may send the press as a message rather than as an event of its own
    const onMessage = (event) => {
      const data = event?.data;
      const said =
        typeof data === "string"
          ? data
          : data?.type || data?.action || data?.event || data?.name || "";
      if (/^(backbutton|hardwarebackpress|native-back|back)$/i.test(String(said))) goBack();
    };

    keepStep();
    window.addEventListener("popstate", onPop);
    window.addEventListener("message", onMessage);
    document.addEventListener("backbutton", goBack);
    window.addEventListener("native-back", goBack);
    window.addEventListener("hardwareBackPress", goBack);

    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("message", onMessage);
      document.removeEventListener("backbutton", goBack);
      window.removeEventListener("native-back", goBack);
      window.removeEventListener("hardwareBackPress", goBack);
    };
  }, [navigate]);

  return null;
}