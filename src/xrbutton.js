export class XRButton {
  static createButton(renderer) {
    const container = document.createElement('div');
    container.id = 'XRLauncherContainer';
    container.style.cssText = `
      position: absolute;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.68);
      backdrop-filter: blur(24px) saturate(190%);
      -webkit-backdrop-filter: blur(24px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-top: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 20px;
      padding: 18px 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      min-width: 320px;
      max-width: 90vw;
      text-align: center;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    // Badge
    const badge = document.createElement('div');
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #94a3b8;
    `;
    badge.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;display:inline-block;"></span> EOD TRAINING SIMULATION`;
    card.appendChild(badge);

    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 19px;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.3px;
      line-height: 1.2;
    `;
    title.textContent = 'Bomb Suit Donning SOP';
    card.appendChild(title);

    // Button Row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = `
      display: flex;
      gap: 10px;
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;
    `;
    card.appendChild(btnRow);

    function createGlassBtn(text, isPrimary, onClick) {
      const btn = document.createElement('button');
      btn.textContent = text;
      
      const primaryStyle = `
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.85), rgba(13, 148, 136, 0.95));
        border: 1px solid rgba(110, 231, 183, 0.5);
        border-top: 1px solid rgba(255, 255, 255, 0.6);
        color: #ffffff;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      `;
      
      const secondaryStyle = `
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        color: #cbd5e1;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      `;

      btn.style.cssText = `
        flex: 1;
        min-width: 140px;
        padding: 12px 18px;
        font-size: 14px;
        font-weight: 600;
        font-family: inherit;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        ${isPrimary ? primaryStyle : secondaryStyle}
      `;

      btn.onmouseenter = () => {
        btn.style.transform = 'translateY(-2px) scale(1.02)';
        btn.style.filter = 'brightness(1.12)';
      };
      btn.onmouseleave = () => {
        btn.style.transform = 'translateY(0) scale(1)';
        btn.style.filter = 'brightness(1.0)';
      };
      btn.onclick = onClick;
      return btn;
    }

    // Hint pill
    const hint = document.createElement('div');
    hint.style.cssText = `
      font-size: 11px;
      color: #64748b;
      display: flex;
      gap: 12px;
      align-items: center;
    `;
    hint.innerHTML = `<span>🖱️ Left Click: Orbit / Pick</span> <span>•</span> <span>Scroll: Zoom</span>`;
    card.appendChild(hint);

    container.appendChild(card);

    let currentSession = null;

    async function startSession(mode) {
      if (currentSession) {
        await currentSession.end();
        return;
      }
      try {
        const session = await navigator.xr.requestSession(mode, {
          optionalFeatures: ['local-floor', 'bounded-floor', 'layers'],
        });

        session.addEventListener('end', () => {
          currentSession = null;
          card.style.display = 'flex';
          checkSupport();
        });

        try {
          renderer.xr.setReferenceSpaceType('local-floor');
        } catch {
          // fallback
        }

        await renderer.xr.setSession(session);
        currentSession = session;
        card.style.display = 'none';
      } catch (err) {
        console.error(`Error starting ${mode} session:`, err);
        alert(`Failed to start ${mode} session: ${err.message}`);
      }
    }

    function checkSupport() {
      btnRow.innerHTML = '';
      if (!window.isSecureContext) {
        const warn = createGlassBtn('⚠️ WEBXR NEEDS HTTPS', false, null);
        warn.disabled = true;
        warn.style.cursor = 'not-allowed';
        warn.style.opacity = '0.6';
        btnRow.appendChild(warn);
        return;
      }

      if (!('xr' in navigator)) {
        const warn = createGlassBtn('VR/AR NOT AVAILABLE', false, null);
        warn.disabled = true;
        warn.style.cursor = 'not-allowed';
        warn.style.opacity = '0.6';
        btnRow.appendChild(warn);
        return;
      }

      Promise.all([
        navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
        navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
      ]).then(([arSupported, vrSupported]) => {
        btnRow.innerHTML = '';
        if (arSupported) {
          const arBtn = createGlassBtn('🥽 Enter MR (Passthrough)', true, () => startSession('immersive-ar'));
          btnRow.appendChild(arBtn);
        }
        if (vrSupported) {
          const vrBtn = createGlassBtn('🕶️ Enter VR', !arSupported, () => startSession('immersive-vr'));
          btnRow.appendChild(vrBtn);
        }
        if (!arSupported && !vrSupported) {
          const warn = createGlassBtn('XR Hardware Not Detected', false, null);
          warn.disabled = true;
          warn.style.cursor = 'not-allowed';
          btnRow.appendChild(warn);
        }
        const exitBtn = createGlassBtn('✕ Exit', false, () => {
          window.close();
          window.location.href = 'about:blank';
        });
        exitBtn.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.3))';
        exitBtn.style.borderColor = 'rgba(248, 113, 113, 0.4)';
        exitBtn.style.color = '#fca5a5';
        btnRow.appendChild(exitBtn);
      });
    }

    checkSupport();
    return container;
  }
}
