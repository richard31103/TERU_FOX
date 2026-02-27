        // Audio engine
import { AppStateMachine, GAME_STATES } from './core/app_state.js';
import { createTransitionEngine } from './core/transition_engine.js';
import { createStoryEngine, loadChapterStorySet } from './story/story_engine.js';
import { checkOOXX, getBestOOXX, OOXX_AI, OOXX_HU, renderOOXXBoard } from './minigames/ooxx.js';

console.log('[BOOT] main.js module active');

        const DEFAULT_TEXT_SPEED_LEVEL = 3;
        const NO_ADVANCE_SELECTORS = [
            'button',
            '.qa-btn',
            '#quick-actions',
            '#top-bar',
            '#chapter-badge',
            '#choice-panel',
            '#controls-bar',
            '#settings-overlay',
            '#history-overlay',
            '#map-overlay',
            '#ooxx-result',
            '#ooxx-screen',
            '#money-popup',
            '#pet-fox-screen',
            '#to-be-continued-screen',
            '#title-screen'
        ].join(', ');

        function textSpeedLevelToMs(level) {
            return Math.round(90 - Number(level) * 8);
        }

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let audioMuted = false;

        function toggleAudioGlobal() {
            audioMuted = !audioMuted;
            const btn = document.getElementById('audio-toggle-btn');

            if (audioMuted) {
                document.getElementById('bgm').pause();
                btn.innerHTML = `<svg class="qa-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><line x1="2" y1="2" x2="22" y2="22"/></svg><span class="tooltip" id="lang-ui-audio">${l10n[currentLang].ui.audioOff}</span>`;
            } else {
                ensureAudio();
                document.getElementById('bgm').play().catch(() => { });
                btn.innerHTML = `<svg class="qa-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span class="tooltip" id="lang-ui-audio">${l10n[currentLang].ui.audioOn}</span>`;
            }
        }

        // Tiny synth tap: short band-pass burst, typewriter feel
        function playTap() {
            if (audioMuted) return;
            const vol = parseFloat(document.getElementById('sfx-vol').value) / 100;
            if (vol === 0) return;
            const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.04, audioCtx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.18));
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 3200;
            filter.Q.value = 1.2;
            const gain = audioCtx.createGain();
            gain.gain.value = vol * 0.13;
            src.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            src.start();
        }

        // Soft hover blip: short sine fade
        function playHover() {
            if (audioMuted) return;
            const vol = parseFloat(document.getElementById('sfx-vol').value) / 100;
            if (vol === 0) return;
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(900, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.06);
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(vol * 0.06, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.09);
        }

        // Click confirm tone: two-tone short blip
        function playClick() {
            if (audioMuted) return;
            const vol = parseFloat(document.getElementById('sfx-vol').value) / 100;
            if (vol === 0) return;
            [520, 760].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq;
                const gain = audioCtx.createGain();
                const t = audioCtx.currentTime + i * 0.05;
                gain.gain.setValueAtTime(vol * 0.08, t);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(t);
                osc.stop(t + 0.1);
            });
        }

        // Resume AudioContext on first interaction (browser policy)
        function ensureAudio() {
            if (audioCtx.state === 'suspended') audioCtx.resume();
        }

        // BGM
        const bgmEl = document.getElementById('bgm');
        function startBGM() {
            if (audioMuted) return;
            ensureAudio();
            const vol = parseFloat(document.getElementById('bgm-vol').value) / 100;
            bgmEl.volume = vol;
            bgmEl.play().catch(() => { });
        }

        // Wire hover/click SFX to all buttons and qa-btns after DOM ready
        function wireSfx() {
            document.querySelectorAll('button, .qa-btn, .choice-btn').forEach(el => {
                el.addEventListener('mouseenter', () => { ensureAudio(); playHover(); });
                el.addEventListener('click', () => { ensureAudio(); playClick(); });
            });
        }

        // Particles
        function createParticles() {
            const container = document.getElementById('particles-container');
            const particleCount = 45; // Amount of floating particles

            for (let i = 0; i < particleCount; i++) {
                const p = document.createElement('div');
                p.className = 'particle';

                // Random size between 2px and 4px
                const size = Math.random() * 2 + 2;
                p.style.width = `${size}px`;
                p.style.height = `${size}px`;

                // Random position
                p.style.left = `${Math.random() * 100}%`;
                p.style.top = `${Math.random() * 100}%`;

                // Random animation delay and duration
                const duration = Math.random() * 8 + 6; // 6s to 14s
                const delay = Math.random() * 14;

                p.style.animationDuration = `${duration}s`;
                p.style.animationDelay = `-${delay}s`;

                // Random horizontal drift
                const xDrift = (Math.random() - 0.5) * 80;
                p.style.setProperty('--x-drift', `${xDrift}px`);

                container.appendChild(p);
            }
        }

        document.addEventListener('DOMContentLoaded', async () => {
            appState = new AppStateMachine(GAME_STATES.TITLE);
            appState.onChange(({ prev, next }) => {
                console.log(`[STATE] ${prev} -> ${next}`);
            });

            try {
                await initStory();
            } catch (err) {
                const fileMode = location.protocol === 'file:';
                const hint = fileMode
                    ? 'Story load failed on file://. Please run via http://localhost.'
                    : 'Story init failed.';
                console.error(hint, err);
                const loadingText = document.getElementById('loading-text');
                if (loadingText) loadingText.textContent = hint;
                return;
            }

            wireSfx();
            createParticles();
            startAssetLoader();
            updateUIText();
            const textSpeedSlider = document.getElementById('text-speed');
            if (textSpeedSlider) {
                textSpeedSlider.value = String(DEFAULT_TEXT_SPEED_LEVEL);
                updateSlider(textSpeedSlider);
            }
        });

        // Dialogue script and localization (JSON-driven)
        let currentLang = 'tw';
        let storyEngine = null;
        let l10n = {};
        let script = [];
        let appState = null;

        function refreshStoryProjection() {
            if (!storyEngine) return;
            l10n = storyEngine.getLegacyL10n();
            script = storyEngine.getPresentationScript();
        }

        async function initStory() {
            const storySet = await loadChapterStorySet('chapter01', ['tw', 'en', 'jp']);
            storyEngine = createStoryEngine(storySet, currentLang);
            refreshStoryProjection();
        }

        let lineIndex = 0;
        let charIndex = 0;
        let typeTimer = null;
        let isTyping = false;
        let autoPlay = false;
        let textSpeedMs = textSpeedLevelToMs(DEFAULT_TEXT_SPEED_LEVEL);
        let inChoiceMode = false;

        // Character Animation State
        let isSpeaking = false;
        let isAngry = false;
        let isHappy = false;
        let isMoneyIntermission = false;
        let skipMoneyResolveClick = false;
        let pendingPostChoiceAction = null;
        let moneyIntermissionDone = null;
        let mobileMoneyFocusActive = false;
        let blinkTimeout = null;
        let speakInterval = null;

        const charIdle = document.getElementById('char-head-idle');
        const charBlink = document.getElementById('char-head-blink');
        const charSpeak = document.getElementById('char-head-speak');
        const charAngry = document.getElementById('char-head-angry');
        const charHappy = document.getElementById('char-head-happy');
        const moneyPopupEl = document.getElementById('money-popup');
        const toBeContinuedEl = document.getElementById('to-be-continued-screen');
        const petFoxScreenEl = document.getElementById('pet-fox-screen');
        const gameContainerEl = document.getElementById('game-container');
        const MOBILE_MONEY_FOCUS_SHIFT_PX = -46;
        const MONEY_SOURCE_WIDTH = 2752;
        const MONEY_SOURCE_HEIGHT = 1536;
        const MONEY_FOCUS_X = 432;
        const MONEY_FOCUS_Y = 560;
        const MONEY_FOCUS_X_PCT = `${((MONEY_FOCUS_X / MONEY_SOURCE_WIDTH) * 100).toFixed(4)}%`;
        const MONEY_FOCUS_Y_PCT = `${((MONEY_FOCUS_Y / MONEY_SOURCE_HEIGHT) * 100).toFixed(4)}%`;

        const dialogueText = document.getElementById('dialogue-text');
        const speakerPlate = document.getElementById('speaker-plate');
        const dialogueArea = document.getElementById('dialogue-area');
        const choicePanel = document.getElementById('choice-panel');
        const DEFAULT_CHOICE_SOURCE_INDICES = [0, 1, 2, 3];
        const FOLLOWUP_CHOICE_SOURCE_INDICES = [0, 2, 3];
        const PET_FOX_DISPLAY_MS = 3000;
        let currentChoiceSourceIndices = [...DEFAULT_CHOICE_SOURCE_INDICES];
        let petFoxTimer = null;
        const choiceButtonEls = Array.from(choicePanel.querySelectorAll('.choice-btn'));
        // const totalDots = script.length; (Removed)

        function setCharState(state) {
            charIdle.classList.remove('active');
            charBlink.classList.remove('active');
            charSpeak.classList.remove('active');
            if (charAngry) charAngry.classList.remove('active');
            if (charHappy) charHappy.classList.remove('active');

            if (isAngry) {
                if (charAngry) charAngry.classList.add('active');
                return;
            }
            if (isHappy) {
                if (charHappy) charHappy.classList.add('active');
                return;
            }

            if (state === 'idle') charIdle.classList.add('active');
            else if (state === 'blink') charBlink.classList.add('active');
            else if (state === 'speak') charSpeak.classList.add('active');
            else if (state === 'angry') { if (charAngry) charAngry.classList.add('active'); }
            else if (state === 'happy') { if (charHappy) charHappy.classList.add('active'); }
        }

        function setChoiceButtons(sourceIndices) {
            const t = l10n[currentLang];
            if (!t) return;
            currentChoiceSourceIndices = sourceIndices.slice();

            const labelEl = choicePanel.querySelector('.choice-label');
            if (labelEl) labelEl.textContent = t.choiceTitle;

            choiceButtonEls.forEach((btn, slotIndex) => {
                const sourceIndex = sourceIndices[slotIndex];
                const numEl = btn.querySelector('.choice-num');
                const textEl = btn.querySelector('.choice-text');
                const text = typeof sourceIndex === 'number' ? t.choices[sourceIndex] : '';

                if (typeof sourceIndex !== 'number' || !text) {
                    btn.style.display = 'none';
                    return;
                }

                btn.style.display = '';
                if (numEl) numEl.textContent = String(slotIndex + 1);
                if (textEl) textEl.textContent = text;
                btn.setAttribute('onclick', `pickChoice(${sourceIndex})`);
            });
        }

        function showChoicePanel(sourceIndices = DEFAULT_CHOICE_SOURCE_INDICES) {
            if (appState && appState.getState() !== GAME_STATES.CHOICE) {
                try { appState.transition(GAME_STATES.CHOICE, { source: 'show_choice_panel' }); } catch (e) { }
            }
            inChoiceMode = true;
            dialogueArea.classList.add('choices-mode');
            choicePanel.classList.add('visible');
            document.getElementById('chapter-badge').style.opacity = '0';
            document.getElementById('chapter-badge').style.pointerEvents = 'none';
            setChoiceButtons(sourceIndices);

            // Preload OOXX UI/AI while user is still on choice screen.
            warmupOOXXEngine();
            prepareOOXXScreen();
        }

        function scheduleNextBlink() {
            if (isSpeaking) return;
            // Human-like blink interval: 2s to 6s
            const nextBlinkTime = 2000 + Math.random() * 4000;
            blinkTimeout = setTimeout(() => {
                if (isSpeaking) return;
                setCharState('blink');
                setTimeout(() => {
                    if (isSpeaking) return;
                    setCharState('idle');
                    // 20% chance for a quick double blink
                    if (Math.random() < 0.2) {
                        setTimeout(() => {
                            if (isSpeaking) return;
                            setCharState('blink');
                            setTimeout(() => {
                                if (isSpeaking) return;
                                setCharState('idle');
                                scheduleNextBlink();
                            }, 100);
                        }, 100);
                    } else {
                        scheduleNextBlink();
                    }
                }, 100); // 100ms blink duration
            }, nextBlinkTime);
        }

        function startSpeakingAnimation() {
            if (speakInterval) clearInterval(speakInterval);
            let mouthOpen = true;
            setCharState('speak'); // start with mouth open
            speakInterval = setInterval(() => {
                mouthOpen = !mouthOpen;
                setCharState(mouthOpen ? 'speak' : 'idle');
            }, 120); // Fast toggle every 120ms
        }

        function stopSpeakingAnimation() {
            if (speakInterval) {
                clearInterval(speakInterval);
                speakInterval = null;
            }
        }

        function setTyping(flag) {
            isTyping = flag;
            dialogueText.classList.toggle('typing', flag);

            isSpeaking = flag;

            if (isAngry || isHappy) {
                stopSpeakingAnimation();
                clearTimeout(blinkTimeout);
                setCharState(isAngry ? 'angry' : 'happy');
                return;
            }

            if (isSpeaking) {
                clearTimeout(blinkTimeout); // Stop blinking when starting to type
                startSpeakingAnimation();
            } else {
                stopSpeakingAnimation();
                setCharState('idle');
                scheduleNextBlink(); // Resume blinking when done typing
            }
        }

        function renderLine(idx) {
            const entry = script[idx];
            const t = l10n[currentLang];
            if (!entry || !t) return;

            if (entry.type === 'choice') {
                showChoicePanel(DEFAULT_CHOICE_SOURCE_INDICES);
                return;
            }

            inChoiceMode = false;
            dialogueArea.classList.remove('choices-mode');
            choicePanel.classList.remove('visible');
            document.getElementById('chapter-badge').style.opacity = '1';
            document.getElementById('chapter-badge').style.pointerEvents = 'auto';
            if (appState && appState.getState() !== GAME_STATES.DIALOGUE) {
                try { appState.transition(GAME_STATES.DIALOGUE, { source: 'render_line' }); } catch (e) { }
            }
            speakerPlate.textContent = t.speaker;
            dialogueText.textContent = '';
            charIndex = 0;
            setTyping(true);
            clearInterval(typeTimer);

            const lineText = t.lines[idx];

            typeTimer = setInterval(() => {
                if (charIndex < lineText.length) {
                    dialogueText.textContent += lineText[charIndex++];
                    playTap();
                } else {
                    clearInterval(typeTimer);
                    setTyping(false);
                    // Add to history once complete typing
                    if (!dialogueHistory.some(r => r.text === lineText && (!r.isChoice))) {
                        dialogueHistory.push({ speaker: t.speaker, text: lineText, isChoice: false });
                    }
                    if (autoPlay && idx < script.length - 1) setTimeout(nextLine, 1800);
                }
            }, textSpeedMs);
        }

        // function updateDots(idx) { ... } (Removed)

        function nextLine() {
            if (inChoiceMode) return;
            if (isTyping) {
                clearInterval(typeTimer);
                setTyping(false);
                // Use localized text, not the undefined script[].text
                const lineText = l10n[currentLang].lines[lineIndex];
                if (lineText) dialogueText.textContent = lineText;
                return;
            }
            if (lineIndex < script.length - 1) {
                lineIndex++;
                renderLine(lineIndex);
            } else {
                showToast(l10n[currentLang].ui.toastContinue);
            }
        }

        function prevLine() {
            if (lineIndex > 0) {
                lineIndex--;
                renderLine(lineIndex);
            }
        }

        let isDeathSequence = false;

        function dispatchAction(actionId, context = {}) {
            if (!actionId) return;
            switch (actionId) {
                case 'start_ooxx':
                    startOOXX();
                    return;
                case 'trigger_death':
                    isDeathSequence = true;
                    setTimeout(triggerDeath, context.delayMs ?? 1000);
                    return;
                case 'return_title':
                    returnToTitle(context.sourceOverlayEl, context.cleanupFn);
                    return;
                case 'show_to_be_continued':
                    setTimeout(showToBeContinued, context.delayMs ?? 700);
                    return;
                case 'show_pet_fox':
                    setTimeout(showPetFox, context.delayMs ?? 700);
                    return;
                case 'show_followup_choices':
                    setTimeout(showFollowupChoices, context.delayMs ?? 0);
                    return;
                default:
                    console.warn('[ACTION] Unknown action:', actionId);
            }
        }

        function runChoiceResponse(responseText, actionId, speakerName) {
            speakerPlate.textContent = speakerName;
            dialogueText.textContent = '';
            charIndex = 0;
            setTyping(true);
            clearInterval(typeTimer);

            typeTimer = setInterval(() => {
                if (charIndex < responseText.length) {
                    dialogueText.textContent += responseText[charIndex++];
                    playTap();
                } else {
                    clearInterval(typeTimer);
                    setTyping(false);
                    if (responseText) {
                        dialogueHistory.push({ speaker: speakerName, text: responseText, isChoice: false });
                    }
                    if (actionId === 'show_to_be_continued') {
                        pendingPostChoiceAction = actionId;
                        return;
                    }
                    if (actionId === 'show_followup_choices') {
                        dispatchAction(actionId, { delayMs: 0 });
                        return;
                    }
                    dispatchAction(actionId, { delayMs: 1000 });
                }
            }, textSpeedMs);
        }

        function pickChoice(idx) {
            inChoiceMode = false;
            dialogueArea.classList.remove('choices-mode');
            choicePanel.classList.remove('visible');
            document.getElementById('chapter-badge').style.opacity = '1';
            document.getElementById('chapter-badge').style.pointerEvents = 'auto';

            const t = l10n[currentLang];
            const fallbackActionId = idx === 3
                ? 'start_ooxx'
                : (idx === 2 ? 'show_to_be_continued' : (idx === 1 ? 'show_pet_fox' : 'trigger_death'));
            const outcome = storyEngine
                ? storyEngine.getChoiceOutcomeByIndex(idx)
                : { actionId: fallbackActionId, responseText: t.responses[idx] };
            const actionId = outcome?.actionId || fallbackActionId;
            const responseText = outcome?.responseText || '';

            // Add user choice to history
            dialogueHistory.push({ speaker: '', text: t.choices[idx], isChoice: true });

            if (actionId === 'start_ooxx' && !responseText) {
                dispatchAction(actionId);
                return;
            }

            isAngry = actionId === 'trigger_death';
            isHappy = actionId === 'show_to_be_continued';
            if (!isHappy) hideMoneyPopup();
            setCharState(isHappy ? 'happy' : (isAngry ? 'angry' : 'idle'));
            if (actionId === 'show_to_be_continued') {
                setTyping(false);
                beginMoneyIntermission(() => {
                    runChoiceResponse(responseText, actionId, t.speaker);
                });
                return;
            }

            runChoiceResponse(responseText, actionId, t.speaker);
        }

        // OOXX mini-game
        let ooxxBoard = [], ooxxLocked = false;
        let ooxxCellElements = [];
        let ooxxPreparedLang = '';
        let ooxxWarmupDone = false;

        function renderOOXX(highlightLine) {
            const cells = ooxxCellElements.length > 0
                ? ooxxCellElements
                : document.querySelectorAll('.ooxx-cell');
            renderOOXXBoard({
                board: ooxxBoard,
                highlightLine,
                cellElements: cells
            });
        }

        function handleOOXXCellClick(event) {
            const i = Number(event.currentTarget?.dataset?.i);
            if (!Number.isInteger(i) || ooxxLocked || ooxxBoard[i]) return;

            ooxxLocked = true;
            ooxxBoard[i] = OOXX_HU;
            playOOXXPlace(false);

            const res = checkOOXX(ooxxBoard);
            if (res || ooxxBoard.every(c => c)) {
                endOOXX(res ? res.winner : null, res ? res.line : null);
                return;
            }

            renderOOXX();
            ooxxSetStatus('ooxxAiTurn');
            setTimeout(aiOOXXMove, OOXX_AI_RESPONSE_DELAY_MS);
        }

        function prepareOOXXScreen() {
            const ui = l10n[currentLang]?.ui;
            if (!ui) return;

            const screen = document.getElementById('ooxx-screen');
            const shouldRebuild = ooxxPreparedLang !== currentLang || ooxxCellElements.length !== 9;

            if (shouldRebuild) {
                screen.innerHTML = `
                    <div id="ooxx-title">${ui.ooxxTitle}</div>
                    <div id="ooxx-grid">${Array.from({ length: 9 }, (_, i) => `<div class="ooxx-cell" data-i="${i}"></div>`).join('')}</div>
                    <div id="ooxx-status">${ui.ooxxAiTurn}</div>`;

                ooxxCellElements = Array.from(screen.querySelectorAll('.ooxx-cell'));
                ooxxCellElements.forEach(cell => {
                    cell.addEventListener('click', handleOOXXCellClick);
                });
                ooxxPreparedLang = currentLang;
            } else {
                const titleEl = screen.querySelector('#ooxx-title');
                if (titleEl) titleEl.textContent = ui.ooxxTitle;
                const statusEl = screen.querySelector('#ooxx-status');
                if (statusEl) statusEl.textContent = ui.ooxxAiTurn;
            }

            renderOOXX();
        }

        function warmupOOXXEngine() {
            if (ooxxWarmupDone) return;
            getBestOOXX(Array(9).fill(''));
            ooxxWarmupDone = true;
        }

        function ooxxSetStatus(key) {
            const el = document.getElementById('ooxx-status');
            if (el) el.textContent = l10n[currentLang].ui[key] || key;
        }

        const OVERLAY_FADE_MS = 1000;
        const OOXX_ENTRY_TRANSITION = { fadeInMs: 1200, holdMs: 1800, fadeOutMs: 1200 };
        const OOXX_RESULT_TRANSITION = { fadeInMs: 350, holdMs: 120, fadeOutMs: 350 };
        const OOXX_RESULT_REVEAL_DELAY_MS = 120;
        const OOXX_RESULT_TEXT_SHOW_DELAY_MS = 20;
        const OOXX_AI_RESPONSE_DELAY_MS = 500;
        const ooxxTransitionEngine = createTransitionEngine({
            curtainEl: document.getElementById('ooxx-curtain'),
            logPrefix: 'OOXX'
        });
        const OOXX_TRANSITION_CANCELLED = ooxxTransitionEngine.TRANSITION_CANCELLED;
        let ooxxTransitionLock = false;
        let ooxxTransitionToken = 0;

        function logOOXXTransition(token, phase) {
            const ts = new Date().toISOString();
            console.log(`[OOXX][${ts}][token:${token}] ${phase}`);
        }

        function beginOOXXTransition(label) {
            if (ooxxTransitionLock) return null;
            ooxxTransitionLock = true;
            ooxxTransitionToken += 1;
            const token = ooxxTransitionToken;
            logOOXXTransition(token, `${label} begin`);
            if (appState && appState.getState() !== GAME_STATES.TRANSITION) {
                appState.transition(GAME_STATES.TRANSITION, { label });
            }
            return token;
        }

        function endOOXXTransition(token, label) {
            if (token !== ooxxTransitionToken) return;
            ooxxTransitionLock = false;
            logOOXXTransition(token, `${label} end`);
        }

        function cancelOOXXTransitions(reason) {
            ooxxTransitionToken += 1;
            ooxxTransitionLock = false;
            ooxxTransitionEngine.cancelTransition(reason || 'manual reset');
            logOOXXTransition(ooxxTransitionToken, 'cancel');
            if (appState && appState.getState() !== GAME_STATES.TITLE) {
                try { appState.transition(GAME_STATES.TITLE, { reason: 'cancel_ooxx' }); } catch (e) { }
            }
        }

        function setOOXXCurtainInstant(visible) {
            ooxxTransitionEngine.setCurtainInstant(visible);
        }

        async function runCurtainTransition({ fadeInMs, holdMs, fadeOutMs }, { token, label, onBlack } = {}) {
            const activeToken = token ?? ooxxTransitionToken;
            if (activeToken !== ooxxTransitionToken) {
                throw new Error(OOXX_TRANSITION_CANCELLED);
            }

            const result = await ooxxTransitionEngine.runCurtainTransition(
                { id: label || 'ooxx', fadeInMs, holdMs, fadeOutMs, onBlack }
            );

            if (result.cancelled || activeToken !== ooxxTransitionToken) {
                throw new Error(OOXX_TRANSITION_CANCELLED);
            }
        }

        function endOOXX(winnerMark, line) {
            ooxxLocked = true;
            renderOOXX(line);
            const ui = l10n[currentLang].ui;
            const isDraw = !winnerMark;
            const resultText = isDraw ? ui.ooxxDraw : ui.ooxxLose;
            const cls = isDraw ? 'draw' : 'lose';
            const subText = isDraw ? '' : (
                currentLang === 'jp'
                    ? '勝ったら特別なCGが見られたかも...'
                    : currentLang === 'en'
                        ? 'Win and you would get a special CG...'
                        : '贏了才有色圖可以看'
            );

            setTimeout(async () => {
                if (ooxxTransitionLock) return;
                const token = beginOOXXTransition('result');
                if (!token) return;
                try {
                    const screen = document.getElementById('ooxx-screen');
                    stopOOXXAmbience();

                    // Stop BGM
                    document.getElementById('bgm').pause();

                    // Play death sound effect on a loss (same as triggerDeath)
                    if (!isDraw && !audioMuted) {
                        const deathSfx = document.getElementById('sfx-death');
                        deathSfx.volume = parseFloat(document.getElementById('sfx-vol').value) / 100;
                        deathSfx.currentTime = 0;
                        deathSfx.play().catch(() => { });
                    }

                    const resultEl = document.getElementById('ooxx-result');
                    const textEl = document.getElementById('ooxx-result-text');
                    const subEl = document.getElementById('ooxx-result-sub');
                    textEl.textContent = resultText;
                    textEl.className = cls;
                    subEl.textContent = subText;

                    await runCurtainTransition(OOXX_RESULT_TRANSITION, {
                        token,
                        label: 'result',
                        onBlack: async () => {
                            screen.style.transition = 'none';
                            screen.classList.add('hidden');
                            void screen.offsetWidth;
                            screen.style.transition = '';

                            resultEl.style.transition = 'none';
                            resultEl.classList.remove('hidden');
                            resultEl.classList.remove('show-text');
                            void resultEl.offsetWidth;
                            resultEl.style.transition = '';
                        }
                    });
                    if (appState) {
                        try { appState.transition(GAME_STATES.RESULT, { source: 'ooxx_result' }); } catch (e) { }
                    }

                    setTimeout(() => {
                        if (token !== ooxxTransitionToken) return;
                        resultEl.classList.add('show-text');
                    }, OOXX_RESULT_TEXT_SHOW_DELAY_MS);

                    resultEl.addEventListener('click', function once() {
                        resultEl.removeEventListener('click', once);
                        resultEl.classList.remove('show-text'); // reset for next time
                        // Return to title and restart BGM
                        returnToTitle(resultEl, () => {
                            lineIndex = 0;
                            document.getElementById('bgm').currentTime = 0;
                            startBGM();
                        });
                    });
                } catch (err) {
                    if (!err || err.message !== OOXX_TRANSITION_CANCELLED) {
                        console.error('OOXX result transition error:', err);
                    }
                } finally {
                    endOOXXTransition(token, 'result');
                }
            }, OOXX_RESULT_REVEAL_DELAY_MS);
        }

        function aiOOXXMove() {
            const move = getBestOOXX(ooxxBoard);
            if (move === -1) return;
            ooxxBoard[move] = OOXX_AI;
            playOOXXPlace(true); // AI piece sound
            const res = checkOOXX(ooxxBoard);
            if (res || ooxxBoard.every(c => c)) {
                endOOXX(res ? res.winner : null, res ? res.line : null);
            } else {
                renderOOXX();
                ooxxLocked = false;
                ooxxSetStatus('ooxxYourTurn');
            }
        }

        async function startOOXX() {
            if (ooxxTransitionLock) return;
            const token = beginOOXXTransition('entry');
            if (!token) return;

            try {
                ooxxBoard = Array(9).fill('');
                ooxxLocked = true;
                const screen = document.getElementById('ooxx-screen');
                const resultEl = document.getElementById('ooxx-result');

                await runCurtainTransition(OOXX_ENTRY_TRANSITION, {
                    token,
                    label: 'entry',
                    onBlack: async () => {
                        // Build and render OOXX while fully black.
                        prepareOOXXScreen();
                        ooxxSetStatus('ooxxAiTurn');

                        // Show OOXX instantly behind black curtain.
                        screen.style.transition = 'none';
                        screen.classList.remove('hidden');
                        void screen.offsetWidth;
                        screen.style.transition = '';
                        resultEl.classList.add('hidden');
                        resultEl.classList.remove('show-text');

                        // Place first AI piece before fade-out, so board is ready on reveal.
                        if (token === ooxxTransitionToken) {
                            aiOOXXMove();
                        }
                    }
                });
                if (appState) {
                    try { appState.transition(GAME_STATES.OOXX, { source: 'ooxx_entry' }); } catch (e) { }
                }
            } catch (err) {
                if (!err || err.message !== OOXX_TRANSITION_CANCELLED) {
                    console.error('OOXX entry transition error:', err);
                }
            } finally {
                endOOXXTransition(token, 'entry');
            }
        }

        // OOXX piece placement sound
        // Short crisp tone, similar in character to playTap() but deeper
        function playOOXXPlace(isAI) {
            if (audioMuted) return;
            try {
                const vol = parseFloat(document.getElementById('sfx-vol').value) / 100;
                if (vol === 0) return;
                const freq = isAI ? 300 : 500; // AI(X) = lower thud, Player(O) = higher click
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.80, audioCtx.currentTime + 0.07);
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(vol * 0.14, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.09);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.10);
            } catch (e) { }
        }

        // Kept as no-ops so existing call sites don't break
        function startOOXXAmbience() { }
        function stopOOXXAmbience() { }

        function triggerDeath() {
            const deathScreen = document.getElementById('death-screen');
            if (appState && appState.getState() !== GAME_STATES.DEATH) {
                try { appState.transition(GAME_STATES.DEATH, { source: 'trigger_death' }); } catch (e) { }
            }
            deathScreen.classList.remove('hidden');

            // Stop BGM and play death sound
            document.getElementById('bgm').pause();
            if (!audioMuted) {
                const deathSfx = document.getElementById('sfx-death');
                deathSfx.volume = parseFloat(document.getElementById('sfx-vol').value) / 100;
                deathSfx.currentTime = 0; // ensure it plays from beginning
                deathSfx.play().catch(() => { });
            }

            // Show text after screen turns black
            setTimeout(() => {
                deathScreen.classList.add('show-text');

                // Return to title after keeping death screen for a few seconds
                setTimeout(() => {
                    deathScreen.classList.remove('show-text');
                    returnToTitle(deathScreen);
                }, 4000);
            }, 1000);
        }

        function showMoneyPopup() {
            if (!moneyPopupEl) return;
            moneyPopupEl.classList.remove('visible');
            // Force restart fade-in for repeated route entries.
            void moneyPopupEl.offsetWidth;
            moneyPopupEl.classList.add('visible');
        }

        function hideMoneyPopup() {
            if (!moneyPopupEl) return;
            moneyPopupEl.classList.remove('visible');
        }

        function setMobileMoneyFocus(enabled) {
            const isMobileLike = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
            mobileMoneyFocusActive = Boolean(enabled && isMobileLike);
            if (!gameContainerEl) return;
            if (!isMobileLike) {
                gameContainerEl.classList.remove('money-focus-mobile');
                return;
            }
            gameContainerEl.classList.toggle('money-focus-mobile', mobileMoneyFocusActive);
        }

        function beginMoneyIntermission(onDone) {
            isMoneyIntermission = true;
            skipMoneyResolveClick = true;
            moneyIntermissionDone = typeof onDone === 'function' ? onDone : null;
            dialogueArea.classList.add('money-hidden');
            showMoneyPopup();
            setMobileMoneyFocus(true);
        }

        function resolveMoneyIntermission() {
            if (!isMoneyIntermission) return;
            isMoneyIntermission = false;
            const resume = moneyIntermissionDone;
            moneyIntermissionDone = null;
            skipMoneyResolveClick = false;

            hideMoneyPopup();
            setMobileMoneyFocus(false);

            setTimeout(() => {
                dialogueArea.classList.remove('money-hidden');
                if (typeof resume === 'function') resume();
            }, 180);
        }

        function resetMoneyIntermission() {
            isMoneyIntermission = false;
            skipMoneyResolveClick = false;
            pendingPostChoiceAction = null;
            moneyIntermissionDone = null;
            dialogueArea.classList.remove('money-hidden');
            setMobileMoneyFocus(false);
            hideMoneyPopup();
        }

        function showToBeContinued() {
            isDeathSequence = true;
            setTyping(false);
            resetMoneyIntermission();
            const tbcText = l10n[currentLang]?.ui?.toBeContinued || 'To Be Continued...';
            const tbcTextEl = document.getElementById('to-be-continued-text');
            if (tbcTextEl) tbcTextEl.textContent = tbcText;
            if (toBeContinuedEl) {
                toBeContinuedEl.classList.remove('hidden');
            }
        }

        function showFollowupChoices() {
            isDeathSequence = false;
            showChoicePanel(FOLLOWUP_CHOICE_SOURCE_INDICES);
        }

        function showPetFox() {
            isDeathSequence = false;
            setTyping(false);
            resetMoneyIntermission();
            if (petFoxTimer) {
                clearTimeout(petFoxTimer);
                petFoxTimer = null;
            }
            if (!petFoxScreenEl) {
                const line = (storyEngine && storyEngine.getTextByKey('resp_2_after_pet', currentLang)) || '摸...摸夠了吧...你還想幹嘛?';
                runChoiceResponse(line, 'show_followup_choices', l10n[currentLang]?.speaker || '');
                return;
            }

            petFoxScreenEl.classList.remove('hidden');
            petFoxTimer = setTimeout(() => {
                petFoxTimer = null;
                petFoxScreenEl.classList.add('hidden');
                const line = (storyEngine && storyEngine.getTextByKey('resp_2_after_pet', currentLang)) || '摸...摸夠了吧...你還想幹嘛?';
                runChoiceResponse(line, 'show_followup_choices', l10n[currentLang]?.speaker || '');
            }, PET_FOX_DISPLAY_MS);
        }

        // Click anywhere to advance
        document.getElementById('game-container').addEventListener('click', function (e) {
            if (isMoneyIntermission) {
                if (skipMoneyResolveClick) {
                    skipMoneyResolveClick = false;
                    return;
                }
                resolveMoneyIntermission();
                return;
            }
            const targetEl = e.target instanceof Element ? e.target : null;
            if (targetEl && targetEl.closest(NO_ADVANCE_SELECTORS)) return;
            if (pendingPostChoiceAction && !isTyping && !isMoneyIntermission) {
                const actionId = pendingPostChoiceAction;
                pendingPostChoiceAction = null;
                dispatchAction(actionId, { delayMs: 0 });
                return;
            }
            const r = document.createElement('div');
            r.className = 'ripple';
            const rect = this.getBoundingClientRect();
            r.style.left = (e.clientX - rect.left - 25) + 'px';
            r.style.top = (e.clientY - rect.top - 25) + 'px';
            this.appendChild(r);
            setTimeout(() => r.remove(), 560);

            if (!isDeathSequence && !isTyping) {
                nextLine();
            }
        });

        // Trigger death shortcut if clicking anywhere on the black death screen overlay (to force show text)
        document.getElementById('death-screen').addEventListener('click', function (e) {
            // If we've started the sequence but the text hasn't shown up yet, fast-forward it
            this.classList.add('show-text');
        });
        if (toBeContinuedEl) {
            toBeContinuedEl.addEventListener('click', function (e) {
                if (toBeContinuedEl.classList.contains('hidden')) return;
                e.stopPropagation();
                returnToTitle(toBeContinuedEl, () => {
                    const bgm = document.getElementById('bgm');
                    if (bgm) {
                        bgm.pause();
                        bgm.currentTime = 0;
                    }
                });
            });
        }

        // Settings
        const overlay = document.getElementById('settings-overlay');
        function openSettings() { overlay.style.display = 'flex'; setTimeout(() => overlay.classList.add('open'), 10); }
        function closeSettings() { overlay.classList.remove('open'); setTimeout(() => overlay.style.display = 'none', 300); }
        function handleSettingsClick(e) { if (e.target === overlay) closeSettings(); }

        function setLanguage(lang) {
            if (storyEngine) {
                const ok = storyEngine.setLanguage(lang);
                if (!ok) return;
                refreshStoryProjection();
            }
            currentLang = lang;
            if (!l10n[lang]) return;
            ['tw', 'jp', 'en'].forEach(l => {
                document.getElementById('tog-lang-' + l).classList.toggle('on', l === lang);
                const titleBtn = document.getElementById('title-lang-' + l);
                if (titleBtn) titleBtn.classList.toggle('on', l === lang);
            });
            if (lineIndex >= script.length) {
                lineIndex = Math.max(0, script.length - 1);
            }
            updateUIText();

            // Re-render current line immediately to reflect language change if not in transition
            if (!isDeathSequence && !isTyping && !inChoiceMode && script[lineIndex]) {
                const t = l10n[lang];
                speakerPlate.textContent = t.speaker;
                dialogueText.textContent = t.lines[lineIndex];
            } else if (inChoiceMode) {
                setChoiceButtons(currentChoiceSourceIndices);
            }
        }

        function updateUIText() {
            const t = l10n[currentLang];
            if (!t || !t.ui) return;
            const ui = t.ui;

            document.getElementById('lang-ui-docTitle').textContent = ui.docTitle;
            document.querySelector('.lang-ui-gameTitle').textContent = ui.gameTitle;
            document.getElementById('lang-btn-gear').textContent = ui.gearBtn;
            document.getElementById('lang-ui-chapTitle').textContent = ui.chapTitle;
            speakerPlate.textContent = t.speaker;

            document.getElementById('start-btn').textContent = t.startBtn;
            document.getElementById('death-text').textContent = t.deathText;
            const tbcTextEl = document.getElementById('to-be-continued-text');
            if (tbcTextEl) tbcTextEl.textContent = ui.toBeContinued || 'To Be Continued...';

            document.getElementById('lang-ui-social').textContent = ui.social;
            document.getElementById('lang-ui-audio').textContent = audioMuted ? ui.audioOff : ui.audioOn;
            document.getElementById('lang-ui-history').textContent = ui.history;
            document.getElementById('lang-ui-map').textContent = ui.map;

            document.getElementById('lang-btn-prev').textContent = ui.prev;
            const histBtn = document.getElementById('lang-btn-hist');
            if (histBtn) histBtn.textContent = ui.histBtn;

            document.getElementById('lang-ui-hist-title').textContent = ui.histTitle;
            document.getElementById('close-history').textContent = ui.closeHist;

            document.getElementById('lang-ui-settings-title').textContent = ui.settingTitle;
            document.getElementById('lang-ui-text-speed').textContent = ui.textSpeed;
            document.getElementById('lang-ui-bgm').textContent = ui.bgm;
            document.getElementById('lang-ui-sfx').textContent = ui.sfx;
            document.getElementById('lang-ui-voice').textContent = ui.voice;
            document.getElementById('lang-ui-fullscreen').textContent = ui.fullScreen;
            const autoEl = document.getElementById('lang-ui-auto');
            if (autoEl) autoEl.textContent = ui.autoPlay;
            document.getElementById('lang-ui-lang').textContent = ui.lang;
            document.getElementById('close-settings').textContent = ui.closeSet;

            document.getElementById('tog-fs-off').textContent = ui.off;
            document.getElementById('tog-fs-on').textContent = ui.on;
            document.getElementById('tog-lang-tw').textContent = ui.tw;
            document.getElementById('tog-lang-jp').textContent = ui.jp;
            document.getElementById('tog-lang-en').textContent = ui.en;
            const titleLangTw = document.getElementById('title-lang-tw');
            const titleLangJp = document.getElementById('title-lang-jp');
            const titleLangEn = document.getElementById('title-lang-en');
            if (titleLangTw) titleLangTw.textContent = ui.tw;
            if (titleLangJp) titleLangJp.textContent = ui.jp;
            if (titleLangEn) titleLangEn.textContent = ui.en;
        }

        function setToggle(group, val) {
            const map = {
                fs: { ids: ['tog-fs-off', 'tog-fs-on'], vals: ['off', 'on'] },
                auto: { ids: ['tog-auto-off', 'tog-auto-on'], vals: ['off', 'on'] }
            };
            if (map[group]) {
                map[group].ids.forEach((id, i) =>
                    document.getElementById(id).classList.toggle('on', map[group].vals[i] === val)
                );
            }
            if (group === 'auto') autoPlay = (val === 'on');
        }

        function updateSlider(el) {
            const pct = ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1) + '%';
            el.style.setProperty('--val', pct);
            if (el.id === 'text-speed') textSpeedMs = textSpeedLevelToMs(el.value);
            if (el.id === 'bgm-vol') bgmEl.volume = el.value / 100;
        }

        function toggleAutoPlay(btn) {
            autoPlay = !autoPlay;
            btn.classList.toggle('active', autoPlay);
            showToast(autoPlay ? l10n[currentLang].ui.toastAutoOn : l10n[currentLang].ui.toastAutoOff);
            if (autoPlay && !isTyping && lineIndex < script.length - 1) setTimeout(nextLine, 1800);
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { });
            else document.exitFullscreen();
        }

        // Gyroscope parallax (mobile only)
        // Uses object-position to shift the visible crop of character images safely,
        // no edge bleed, no transform override conflicts.
        (function () {
            if (!window.DeviceOrientationEvent) return;

            const MAX_SHIFT = 10;   // px: how far image crops can shift
            const SMOOTH = 0.1; // lerp speed (lower = smoother)
            const BG_SHIFT_RATIO = 0.4;
            const BG_MAX_SHIFT_PX = 6;

            let baseGamma = null, baseBeta = null;
            let targetX = 0, targetY = 0;
            let smoothX = 0, smoothY = 0;
            let started = false;
            let starting = false;
            let rafStarted = false;
            let orientationEvents = 0;
            const bgEl = document.getElementById('bg');
            const bgSplashEl = document.getElementById('bg-splash');

            function lerp(a, b, t) { return a + (b - a) * t; }
            function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

            function onOrientation(e) {
                orientationEvents += 1;
                const gamma = e.gamma != null ? e.gamma : 0;
                const beta = e.beta != null ? e.beta : 0;
                if (baseGamma === null) { baseGamma = gamma; baseBeta = beta; return; }
                const dg = clamp(gamma - baseGamma, -40, 40);
                const db = clamp(beta - baseBeta, -20, 20);
                targetX = (dg / 25) * MAX_SHIFT;
                targetY = (db / 20) * MAX_SHIFT;
            }

            function tick() {
                smoothX = lerp(smoothX, targetX, SMOOTH);
                smoothY = lerp(smoothY, targetY, SMOOTH);
                const focusShiftX = mobileMoneyFocusActive ? MOBILE_MONEY_FOCUS_SHIFT_PX : 0;

                const bgShiftX = clamp(smoothX * BG_SHIFT_RATIO, -BG_MAX_SHIFT_PX, BG_MAX_SHIFT_PX) + focusShiftX;
                const bgShiftY = clamp(smoothY * BG_SHIFT_RATIO, -BG_MAX_SHIFT_PX, BG_MAX_SHIFT_PX);
                const bgPos = `calc(50% + ${bgShiftX.toFixed(2)}px) calc(50% + ${bgShiftY.toFixed(2)}px)`;
                if (bgEl) bgEl.style.backgroundPosition = bgPos;
                if (bgSplashEl) bgSplashEl.style.backgroundPosition = bgPos;

                // Shift the visible crop of every char image via object-position.
                // This never moves the element boundary, so no black edges appear.
                const rootStyle = getComputedStyle(document.documentElement);
                const baseX = rootStyle.getPropertyValue('--char-focus-x').trim() || '50%';
                const baseY = rootStyle.getPropertyValue('--char-focus-y').trim() || '22%';
                const px = `calc(${baseX} + ${(smoothX + focusShiftX).toFixed(2)}px)`;
                const py = `calc(${baseY} + ${smoothY.toFixed(2)}px)`;
                document.querySelectorAll('.char-img').forEach(img => {
                    img.style.objectPosition = `${px} ${py}`;
                });
                if (moneyPopupEl) {
                    moneyPopupEl.style.objectPosition = `calc(${MONEY_FOCUS_X_PCT} + ${focusShiftX.toFixed(2)}px) ${MONEY_FOCUS_Y_PCT}`;
                }

                requestAnimationFrame(tick);
            }

            function removeStartListeners() {
                document.removeEventListener('pointerdown', startGyro);
                document.removeEventListener('touchstart', startGyro);
                document.removeEventListener('click', startGyro);
            }

            function ensureTick() {
                if (rafStarted) return;
                rafStarted = true;
                requestAnimationFrame(tick);
            }

            function attachOrientation() {
                window.addEventListener('deviceorientation', onOrientation, { passive: true });
                ensureTick();
                setTimeout(() => {
                    if (orientationEvents === 0) {
                        console.warn('[GYRO] deviceorientation did not fire. Check browser permissions/settings.');
                    }
                }, 1200);
            }

            async function startGyro() {
                if (started || starting) return;
                starting = true;
                try {
                    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                        const state = await DeviceOrientationEvent.requestPermission();
                        if (state !== 'granted') {
                            console.warn('[GYRO] permission not granted:', state);
                            return;
                        }
                    }
                    started = true;
                    removeStartListeners();
                    attachOrientation();
                    console.log('[GYRO] started');
                } catch (err) {
                    console.warn('[GYRO] start failed:', err);
                } finally {
                    starting = false;
                }
            }

            // User gesture is required on some browsers (especially iOS).
            document.addEventListener('pointerdown', startGyro, { passive: true });
            document.addEventListener('touchstart', startGyro, { passive: true });
            document.addEventListener('click', startGyro);
        })();

        // Asset preloader

        const assetsToLoad = [
            'body.png',
            'tail.png',
            'no speak head.png',
            'blink head.png',
            'speak head.png',
            'angry head.png',
            'happy head.png',
            'money.png',
            'pet fox_M.jpg',
            'BG.jpg',
            'ad630f06-22cd-45a6-842b-1e8e78c36a61.jpg',
            'fox-face_1f98a.png'
        ];
        const imageAssetsToLoad = Array.from(
            new Set(assetsToLoad.filter(src => /\.(png|jpe?g|webp|gif)$/i.test(src)))
        );

        let loadedAssetsCount = 0;

        function updateLoaderProgress(totalCount = imageAssetsToLoad.length) {
            loadedAssetsCount++;
            const safeTotal = Math.max(totalCount, 1);
            const pct = Math.min(100, Math.floor((loadedAssetsCount / safeTotal) * 100));
            document.getElementById('loading-bar-fill').style.width = pct + '%';
            document.getElementById('loading-text').textContent = `Loading Assets... ${pct}%`;

            if (loadedAssetsCount >= safeTotal) {
                setTimeout(() => {
                    document.getElementById('loading-container').style.display = 'none';
                    document.getElementById('start-btn').style.display = 'block';
                }, 400);
            }
        }

        function loadImageDecoded(src) {
            return new Promise(resolve => {
                const img = new Image();
                let settled = false;

                const finish = () => {
                    if (settled) return;
                    settled = true;
                    resolve();
                };

                const finalize = () => {
                    if (typeof img.decode === 'function') {
                        img.decode().catch(() => { }).finally(finish);
                    } else {
                        finish();
                    }
                };

                img.onload = finalize;
                img.onerror = finish;
                img.src = src;

                if (img.complete) {
                    if (img.naturalWidth > 0) finalize();
                    else finish();
                }
            });
        }

        function startAssetLoader() {
            loadedAssetsCount = 0;
            const totalCount = imageAssetsToLoad.length;
            if (totalCount === 0) {
                updateLoaderProgress(1);
                return;
            }
            imageAssetsToLoad.forEach(src => {
                loadImageDecoded(src).finally(() => updateLoaderProgress(totalCount));
            });
        }

        // Map and history

        function openSocial() {
            if (confirm(l10n[currentLang].ui.socialPrompt)) {
                window.open('https://www.facebook.com/teru.fox', '_blank');
            }
        }

        const mapOverlay = document.getElementById('map-overlay');
        const histOverlay = document.getElementById('history-overlay');

        function openMap() { mapOverlay.classList.remove('hidden'); }
        function closeMap(e) { if (e) e.stopPropagation(); mapOverlay.classList.add('hidden'); }

        const dialogueHistory = []; // Stores {speaker, text, isChoice}

        function openHistory() {
            const list = document.getElementById('history-list');
            list.innerHTML = '';

            if (dialogueHistory.length === 0) {
                list.innerHTML = `<div class="history-entry"><div class="history-text" style="text-align:center; opacity:0.5;">${l10n[currentLang].ui.noHistory}</div></div>`;
            } else {
                dialogueHistory.forEach(r => {
                    const div = document.createElement('div');
                    div.className = 'history-entry';
                    if (r.isChoice) {
                        div.innerHTML = `<div class="history-text history-choice">▶ ${r.text}</div>`;
                    } else {
                        div.innerHTML = `
                            <div class="history-speaker">${r.speaker}</div>
                            <div class="history-text">${r.text}</div>
                        `;
                    }
                    list.appendChild(div);
                });
            }
            histOverlay.classList.remove('hidden');

            // Scroll to bottom
            setTimeout(() => { list.scrollTop = list.scrollHeight; }, 10);
        }

        function closeHistory() { histOverlay.classList.add('hidden'); }
        function handleHistoryClick(e) { if (e.target === histOverlay) closeHistory(); }

        // Legacy toast-only history function removed; history panel is used instead.

        // Game flow control
        function startGame() {
            ensureAudio();
            startBGM();
            document.getElementById('title-screen').classList.add('hidden');
            if (storyEngine) {
                storyEngine.setLanguage(currentLang);
                refreshStoryProjection();
            }

            // Thorough state reset to prevent stale state from previous session
            clearInterval(typeTimer);
            typeTimer = null;
            lineIndex = 0;
            charIndex = 0;
            isTyping = false;
            inChoiceMode = false;
            isDeathSequence = false;
            isAngry = false;
            isHappy = false;
            pendingPostChoiceAction = null;
            currentChoiceSourceIndices = [...DEFAULT_CHOICE_SOURCE_INDICES];
            dialogueHistory.length = 0;

            // Reset UI elements that may be dirty
            dialogueArea.classList.remove('choices-mode');
            choicePanel.classList.remove('visible');
            dialogueText.textContent = '';
            document.getElementById('chapter-badge').style.opacity = '1';
            document.getElementById('chapter-badge').style.pointerEvents = 'auto';

            // Clear any inline styles that could interfere with hiding/showing
            document.getElementById('title-screen').style.opacity = '';
            document.getElementById('title-screen').classList.add('hidden');
            cancelOOXXTransitions('startGame reset');
            document.getElementById('ooxx-screen').classList.add('hidden');
            const ooxxResultEl = document.getElementById('ooxx-result');
            ooxxResultEl.classList.add('hidden');
            ooxxResultEl.classList.remove('show-text');
            resetMoneyIntermission();
            if (toBeContinuedEl) toBeContinuedEl.classList.add('hidden');
            if (petFoxTimer) {
                clearTimeout(petFoxTimer);
                petFoxTimer = null;
            }
            if (petFoxScreenEl) petFoxScreenEl.classList.add('hidden');
            setChoiceButtons(DEFAULT_CHOICE_SOURCE_INDICES);

            // Fade out BG.jpg splash as character fades in
            const splash = document.getElementById('bg-splash');
            if (splash) splash.classList.add('fade-out');

            clearTimeout(blinkTimeout);
            stopSpeakingAnimation();
            setCharState('idle');
            scheduleNextBlink();
            if (appState && appState.getState() !== GAME_STATES.DIALOGUE) {
                try { appState.transition(GAME_STATES.DIALOGUE, { source: 'start_game' }); } catch (e) { }
            }
            // Wait for BG.jpg to finish fading (1.4s) before starting dialogue
            setTimeout(() => renderLine(0), 1400);
        }

        function transitionToTitleWithCover(sourceOverlayEl, cleanupFn) {
            if (typeof cleanupFn === 'function') cleanupFn();
            const title = document.getElementById('title-screen');
            title.style.opacity = '';
            title.classList.remove('hidden');
            setTimeout(() => {
                if (sourceOverlayEl) {
                    sourceOverlayEl.classList.add('hidden');
                    sourceOverlayEl.classList.remove('show-text');
                }
            }, OVERLAY_FADE_MS + 40);
        }

        function returnToTitle(sourceOverlayEl, cleanupFn) {
            // Stop logic / reset
            clearInterval(typeTimer);
            isDeathSequence = false;
            isAngry = false;
            isHappy = false;
            pendingPostChoiceAction = null;
            currentChoiceSourceIndices = [...DEFAULT_CHOICE_SOURCE_INDICES];
            setCharState('idle'); // revert character to idle
            dialogueText.textContent = ''; // clear text
            resetMoneyIntermission();
            if (toBeContinuedEl) toBeContinuedEl.classList.add('hidden');
            if (petFoxTimer) {
                clearTimeout(petFoxTimer);
                petFoxTimer = null;
            }
            if (petFoxScreenEl) petFoxScreenEl.classList.add('hidden');
            setChoiceButtons(DEFAULT_CHOICE_SOURCE_INDICES);
            cancelOOXXTransitions('returnToTitle reset');
            if (storyEngine) {
                storyEngine.setLanguage(currentLang);
                refreshStoryProjection();
            }
            if (appState && appState.getState() !== GAME_STATES.TITLE) {
                try { appState.transition(GAME_STATES.TITLE, { source: 'return_to_title' }); } catch (e) { }
            }
            transitionToTitleWithCover(sourceOverlayEl, cleanupFn);
        }

        Object.assign(window, {
            closeHistory,
            closeMap,
            closeSettings,
            handleHistoryClick,
            handleSettingsClick,
            openHistory,
            openMap,
            openSettings,
            openSocial,
            pickChoice,
            prevLine,
            setLanguage,
            setToggle,
            startGame,
            toggleAudioGlobal,
            toggleFullscreen,
            updateSlider
        });

        // Start
        scheduleNextBlink();
        // Do not renderLine(0) immediately, wait for Start
        // renderLine(0);
