/**
 * Ends the identity provider's session without leaving the app: the provider's logout page loads in a hidden
 * frame, with the user's own provider cookies, and the frame is removed once it has loaded (or after a short
 * wait). Browser only.
 *
 * Works when the provider lets its logout page be framed and sends its session cookie in that frame. A page
 * that refuses to be framed still fires "load", so a refusal cannot be detected here.
 */
export function endProviderSessionInBackground(url: string, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.referrerPolicy = "no-referrer";
    Object.assign(frame.style, { position: "fixed", width: "0", height: "0", border: "0", visibility: "hidden" });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      frame.remove();
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    frame.addEventListener("load", () => window.setTimeout(finish, 300)); // A moment for the provider to finish.
    frame.src = url;
    document.body.appendChild(frame);
  });
}
