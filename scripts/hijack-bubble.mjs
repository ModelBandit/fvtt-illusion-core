// TODO:
// 1. Add image change support.
// 2. Split this into a separate submodule after completion.

/**
 * Build the shared chat-log bubble used to review an intercepted player message.
 * Chat owns the moderation workflow; Core owns this presentation shell so future
 * identity/image presentation can reuse the same bubble without depending on Chat.
 */
export function createHijackBubble(request, { onSend, isBusy = false } = {}) {
  const entry = document.createElement("li");
  entry.className = "chat-message flexcol spc-moderation-message";
  entry.dataset.spcModerationRequestId = request.requestId;

  const header = document.createElement("header");
  header.className = "message-header flexrow";

  const sender = document.createElement("h4");
  sender.className = "message-sender";
  sender.textContent = request.displayName || request.sourceUserName || "플레이어";

  const metadata = document.createElement("span");
  metadata.className = "message-metadata spc-moderation-position";
  metadata.dataset.spcModerationPosition = "true";
  metadata.textContent = "검열 대기";
  header.append(sender, metadata);

  const content = document.createElement("div");
  content.className = "message-content spc-moderation-content";

  const senderRow = document.createElement("label");
  senderRow.className = "spc-moderation-sender";
  const senderLabel = document.createElement("span");
  senderLabel.textContent = "표시 이름";
  const senderInput = document.createElement("input");
  senderInput.type = "text";
  senderInput.maxLength = 100;
  senderInput.dataset.spcModerationField = "display-name";
  senderInput.value = request.displayName ?? request.sourceUserName ?? "";
  senderInput.placeholder = request.sourceUserName || "플레이어 이름";
  senderInput.addEventListener("input", () => {
    request.displayName = senderInput.value;
    sender.textContent = senderInput.value.trim() || request.sourceUserName || "플레이어";
  });
  senderInput.addEventListener("keydown", event => event.stopPropagation());
  senderRow.append(senderLabel, senderInput);

  const original = document.createElement("div");
  original.className = "spc-moderation-original";
  original.textContent = htmlToPlainText(request.content);

  const replacement = document.createElement("textarea");
  replacement.className = "spc-moderation-replacement";
  replacement.dataset.spcModerationField = "replacement";
  replacement.placeholder = "환상 상태 플레이어에게 보낼 가짜 채팅";
  replacement.value = request.replacementText ?? "";
  replacement.spellcheck = false;
  replacement.addEventListener("input", () => { request.replacementText = replacement.value; });
  replacement.addEventListener("keydown", event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      void onSend?.(request, replacement.value);
    }
  });

  const actions = document.createElement("div");
  actions.className = "spc-moderation-actions";
  const sendButton = document.createElement("button");
  sendButton.type = "button";
  sendButton.className = "spc-moderation-send";
  sendButton.textContent = "전송";
  sendButton.disabled = Boolean(isBusy);
  sendButton.addEventListener("click", () => void onSend?.(request, replacement.value));
  actions.append(sendButton);

  content.append(senderRow, original, replacement, actions);
  entry.append(header, content);
  return entry;
}

function htmlToPlainText(html = "") {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = String(html);
  wrapper.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  return wrapper.textContent ?? "";
}
