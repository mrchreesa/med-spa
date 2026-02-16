(function () {
  "use strict";

  var scripts = document.getElementsByTagName("script");
  var currentScript = scripts[scripts.length - 1];
  var tenantId = currentScript.getAttribute("data-tenant-id");

  if (!tenantId) {
    console.error("Med Spa Chat: data-tenant-id attribute is required");
    return;
  }

  var host =
    currentScript.getAttribute("data-host") ||
    currentScript.src.replace(/\/embed\.js.*$/, "");
  var position = currentScript.getAttribute("data-position") || "right";
  var primaryColor =
    currentScript.getAttribute("data-color") || "#8B7355";

  var isOpen = false;
  var SVG_NS = "http://www.w3.org/2000/svg";

  // Helper: create SVG element safely
  function createSvgIcon(paths) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("xmlns", SVG_NS);
    paths.forEach(function (p) {
      if (p.type === "path") {
        var path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", p.d);
        svg.appendChild(path);
      } else if (p.type === "circle") {
        var circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", p.cx);
        circle.setAttribute("cy", p.cy);
        circle.setAttribute("r", p.r);
        svg.appendChild(circle);
      }
    });
    return svg;
  }

  // Icon definitions
  var chatIconPaths = [
    { type: "path", d: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" },
    { type: "circle", cx: "8", cy: "10", r: "1.2" },
    { type: "circle", cx: "12", cy: "10", r: "1.2" },
    { type: "circle", cx: "16", cy: "10", r: "1.2" }
  ];
  var closeIconPaths = [
    { type: "path", d: "M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" }
  ];

  // Styles
  var style = document.createElement("style");
  style.textContent = [
    "@keyframes mspa-breathe{0%,100%{box-shadow:0 4px 20px rgba(139,115,85,0.2)}50%{box-shadow:0 6px 24px rgba(139,115,85,0.35),0 0 0 6px rgba(139,115,85,0)}}",
    "#mspa-chat-bubble{position:fixed;bottom:24px;" +
      (position === "left" ? "left" : "right") +
      ":24px;width:56px;height:56px;border-radius:16px;background:" +
      primaryColor +
      ";border:none;cursor:pointer;z-index:2147483647;display:flex;align-items:center;justify-content:center;transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1),border-radius 0.3s;animation:mspa-breathe 4s ease-in-out infinite}",
    "#mspa-chat-bubble:hover{transform:scale(1.08);border-radius:14px}",
    "#mspa-chat-bubble:active{transform:scale(0.95)}",
    "#mspa-chat-bubble svg{width:24px;height:24px;fill:white;transition:transform 0.3s}",
    "#mspa-chat-badge{position:absolute;top:-3px;right:-3px;width:14px;height:14px;border-radius:50%;background:#C67272;border:2.5px solid white;display:none}",
    "#mspa-chat-frame{position:fixed;bottom:92px;" +
      (position === "left" ? "left" : "right") +
      ":24px;width:380px;height:580px;border:none;border-radius:20px;box-shadow:0 12px 48px rgba(45,41,38,0.1),0 2px 8px rgba(45,41,38,0.05);z-index:2147483647;overflow:hidden;opacity:0;transform:translateY(12px) scale(0.96);pointer-events:none;visibility:hidden;transition:opacity 0.3s ease,transform 0.35s cubic-bezier(0.16,1,0.3,1),visibility 0.3s}",
    "#mspa-chat-frame.mspa-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;visibility:visible}",
    "@media(max-width:480px){#mspa-chat-frame{width:100%;height:100%;bottom:0;right:0;left:0;border-radius:0}}"
  ].join("");
  document.head.appendChild(style);

  // Create bubble
  var bubble = document.createElement("button");
  bubble.id = "mspa-chat-bubble";
  bubble.setAttribute("aria-label", "Open chat");

  function setBubbleIcon(paths) {
    while (bubble.firstChild) bubble.removeChild(bubble.firstChild);
    bubble.appendChild(createSvgIcon(paths));
    var badge = document.createElement("span");
    badge.id = "mspa-chat-badge";
    bubble.appendChild(badge);
  }

  setBubbleIcon(chatIconPaths);
  document.body.appendChild(bubble);

  // Create iframe
  var iframe = document.createElement("iframe");
  iframe.id = "mspa-chat-frame";
  iframe.src = host + "/embed?tenant_id=" + encodeURIComponent(tenantId);
  iframe.setAttribute("title", "Chat with us");
  iframe.setAttribute("allow", "clipboard-write");
  document.body.appendChild(iframe);

  // Toggle
  bubble.addEventListener("click", function () {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.classList.add("mspa-open");
      while (bubble.firstChild) bubble.removeChild(bubble.firstChild);
      bubble.appendChild(createSvgIcon(closeIconPaths));
      bubble.style.animation = "none";
      bubble.style.borderRadius = "14px";
    } else {
      iframe.classList.remove("mspa-open");
      setBubbleIcon(chatIconPaths);
      bubble.style.animation = "mspa-breathe 4s ease-in-out infinite";
      bubble.style.borderRadius = "16px";
    }
    var badge = document.getElementById("mspa-chat-badge");
    if (badge) badge.style.display = "none";
    bubble.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
  });
})();
