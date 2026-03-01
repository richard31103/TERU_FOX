        // Audio engine
import { AppStateMachine, GAME_STATES } from '../core/app_state.js';
import { createTransitionEngine } from '../core/transition_engine.js';
import { createStoryEngine, loadChapterStorySet } from '../story/story_engine.js';
import { checkOOXX, getBestOOXX, OOXX_AI, OOXX_HU, renderOOXXBoard } from '../minigames/ooxx.js';
import { createAppContext } from './app_context.js';
import { SCENE_ASSETS as SCENE_CONFIG, SCENE_BED, SCENE_DEFAULT, SCENE_FIGHT, PRELOAD_IMAGE_ASSETS } from '../config/scene_assets.js';
import {
    AFRAID_HEADS,
    AFRAID_TARGET_CHOICE_TITLE_TW,
    AFRAID_TARGET_LINES_TW,
    BED_ENTRY_TRANSITION,
    BED_STOP_LINE_BY_LANG,
    BED_TAIL_BURST_RESET_MS,
    DEFAULT_CHOICE_SOURCE_INDICES,
    FIGHT_CHOICE_LABELS,
    FIGHT_SCENE_OBJECT_POSITION,
    FIGHT_SOURCE_FALLBACK_SIZE,
    FIGHT_TAIL_PIVOT_SOURCE,
    FIGHT_TEXT,
    FOLLOWUP_CHOICE_SOURCE_INDICES,
    HEAD_TOUCH_ASSETS,
    HEAD_TOUCH_TEXT,
    HEAD_TOUCH_THRESHOLDS,
    OPENING_HEADS,
    OPENING_TEXT,
    PET_FOX_DISPLAY_MS,
    SHY_BED_TRANSITION_HEADS
} from '../config/runtime_text.js';
import { createAssetPreloader } from '../systems/asset_preloader.js';
import { createGyroParallaxSystem } from '../systems/gyro_parallax.js';
import { createChoiceController } from '../features/choice_controller.js';
import { createDialogueController } from '../features/dialogue_controller.js';
import { createBedFlowState } from '../features/bed_flow.js';
import { createFightFlowFx } from '../features/fight_flow.js';
import { bindOverlayController } from '../features/overlay_controller.js';

const DEBUG = false;
const debugLog = (...args) => {
    if (DEBUG) console.log(...args);
};

debugLog('[BOOT] game_app module active');

        const DEFAULT_TEXT_SPEED_LEVEL = 3;
        const NO_ADVANCE_SELECTORS = [
            'button',
            '.qa-btn',
            '#quick-actions',
            '#top-bar',
            '#chapter-badge',
            '#choice-panel',
            '#head-touch-zone',
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

        const appContext = createAppContext(document);
        const { refs: ctxRefs, dialogueUI, audio: audioService, audioCtx } = appContext;
        let audioMuted = false;
        const PUNCH_SFX_MIN_INTERVAL_MS = 100;
        let lastPunchSfxAt = 0;

        function toggleAudioGlobal() {
            audioMuted = audioService.setMuted(!audioMuted);
            const btn = document.getElementById('audio-toggle-btn');

            if (audioMuted) {
                btn.innerHTML = `<svg class="qa-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><line x1="2" y1="2" x2="22" y2="22"/></svg><span class="tooltip" id="lang-ui-audio">${l10n[currentLang].ui.audioOff}</span>`;
            } else {
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

        function playPunchSfx() {
            if (audioMuted) return;
            const vol = parseFloat(document.getElementById('sfx-vol').value) / 100;
            if (vol === 0) return;
            const now = performance.now();
            if (now - lastPunchSfxAt < PUNCH_SFX_MIN_INTERVAL_MS) return;
            lastPunchSfxAt = now;
            const punchSfx = ctxRefs.sfxPunch;
            if (!punchSfx) return;
            punchSfx.volume = vol;
            punchSfx.currentTime = 0;
            punchSfx.play().catch(() => { });
        }

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
            audioService.ensureAudio();
        }

        // BGM
        const bgmEl = ctxRefs.bgm;
        function startBGM() {
            if (audioMuted) return;
            ensureAudio();
            const vol = parseFloat(document.getElementById('bgm-vol').value) / 100;
            bgmEl.volume = vol;
            audioService.startBgm();
        }

        // Wire hover/click SFX to all buttons and qa-btns after DOM ready
        function wireSfx() {
            document.querySelectorAll('button, .qa-btn, .choice-btn').forEach(el => {
                el.addEventListener('mouseenter', () => { ensureAudio(); playHover(); });
                el.addEventListener('click', () => {
                    ensureAudio();
                    const clickSfx = el.dataset?.clickSfx || '';
                    if (clickSfx === 'none') return;
                    if (clickSfx === 'punch') {
                        playPunchSfx();
                        return;
                    }
                    playClick();
                });
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
                debugLog(`[STATE] ${prev} -> ${next}`);
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

            bindUiActions();
            wireSfx();
            createParticles();
            startAssetLoader();
            updateUIText();
            syncFullscreenToggle();
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
        let currentDialogueLineText = '';
        let inChoiceMode = false;

        // Character Animation State
        let isSpeaking = false;
        let isAngry = false;
        let isHappy = false;
        let isMoneyIntermission = false;
        let skipMoneyResolveClick = false;
        let pendingPostChoiceAction = null;
        let pendingClickAdvance = null;
        let moneyIntermissionDone = null;
        let mobileMoneyFocusActive = false;
        let blinkTimeout = null;
        let speakInterval = null;

        const bgEl = ctxRefs.bg;
        const bgSplashEl = ctxRefs.bgSplash;
        const charTail = ctxRefs.charTail;
        const charBody = ctxRefs.charBody;
        const charIdle = ctxRefs.charIdle;
        const charBlink = ctxRefs.charBlink;
        const charSpeak = ctxRefs.charSpeak;
        const charAngry = ctxRefs.charAngry;
        const charHappy = ctxRefs.charHappy;
        const charHappyTalk = ctxRefs.charHappyTalk;
        const charHeadphone = document.getElementById('char-headphone');
        const moneyPopupEl = ctxRefs.moneyPopup;
        const toBeContinuedEl = ctxRefs.toBeContinuedScreen;
        const petFoxScreenEl = ctxRefs.petFoxScreen;
        const gameContainerEl = ctxRefs.gameContainer;
        // Decouple mobile money popup offset from character framing:
        // character stays stable while money popup can be repositioned.
        const MOBILE_MONEY_CHARACTER_SHIFT_PX = 0;
        const MOBILE_MONEY_POPUP_SHIFT_PX = -200;
        const MONEY_SOURCE_WIDTH = 2752;
        const MONEY_SOURCE_HEIGHT = 1536;
        const MONEY_FOCUS_X = 432;
        const MONEY_FOCUS_Y = 560;
        const MONEY_FOCUS_X_PCT = `${((MONEY_FOCUS_X / MONEY_SOURCE_WIDTH) * 100).toFixed(4)}%`;
        const MONEY_FOCUS_Y_PCT = `${((MONEY_FOCUS_Y / MONEY_SOURCE_HEIGHT) * 100).toFixed(4)}%`;

        const dialogueText = dialogueUI.refs.dialogueText;
        const speakerPlate = dialogueUI.refs.speakerPlate;
        const dialogueArea = dialogueUI.refs.dialogueArea;
        const choicePanel = dialogueUI.refs.choicePanel;
        const characterContainerEl = ctxRefs.characterContainer;
        const headTouchFaceEl = document.getElementById('char-head-touch');
        const headTouchZoneEl = document.getElementById('head-touch-zone');
        const fightDamageNumberEl = ctxRefs.fightDamageNumber;
        const fightRedFlashEl = ctxRefs.fightRedFlash;
        const chapterBadgeEl = dialogueUI.refs.chapterBadge;
        const choiceController = createChoiceController({ choicePanelEl: choicePanel, chapterBadgeEl });
        const dialogueController = createDialogueController({
            dialogueTextEl: dialogueText,
            speakerPlateEl: speakerPlate,
            dialogueAreaEl: dialogueArea
        });
        const fightFx = createFightFlowFx({
            characterContainerEl,
            damageNumberEl: fightDamageNumberEl,
            redFlashEl: fightRedFlashEl
        });
        let currentChoiceSourceIndices = [...DEFAULT_CHOICE_SOURCE_INDICES];
        let petFoxTimer = null;
        let activeSceneId = SCENE_DEFAULT;
        let sceneSupportsSpecialHeads = true;
        let bedHeadVariant = 'normal';
        let isAfraidHeadMode = false;
        let isShyBedTransitionMode = false;
        let isOpeningPrologueActive = false;
        let isHappyTalkMode = false;
        let happyMouthOpen = false;
        let isRuntimeChoiceMode = false;
        let runtimeChoiceState = null;
        let isFightSequenceActive = false;
        let hasUsedMainOOXXChoice = false;
        let headTouchStage = 0;
        let headTouchTapCount = 0;
        let headTouchInterruptActive = false;
        let headTouchAwaitResumeClick = false;
        let headTouchInterruptFaceMode = 'normal';
        let headTouchSnapshot = null;
        let headTouchRestoreTimer = null;
        const HEAD_TOUCH_ANGRY_BLINK_MIN_MS = 1400;
        const HEAD_TOUCH_ANGRY_BLINK_MAX_MS = 2400;
        const HEAD_TOUCH_ANGRY_BLINK_HOLD_MS = 140;
        const HEAD_TOUCH_FACE_FLASH_MS = 220;
        let headTouchAngryBlinkTimer = null;
        let headTouchAngryBlinkHoldTimer = null;
        let headTouchAngryRestoreTimer = null;
        let isOpeningDialogueLocked = false;
        let isOpeningGreetingHeadTouchLocked = false;
        const bedFlow = createBedFlowState();
        const choiceButtonEls = choiceController.choiceButtons;
        // const totalDots = script.length; (Removed)

        function syncMobileChoiceUi() {
            if (!gameContainerEl) return;
            gameContainerEl.classList.toggle('mobile-choice-open', inChoiceMode);
        }

        function clearChoicePressedState() {
            choiceController.clearPressedState();
        }

        function sameChoiceSourceIndices(a, b) {
            if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
            for (let i = 0; i < a.length; i += 1) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }

        function isMainChoiceOptionDisabled(sourceIndex) {
            return sourceIndex === 3 && hasUsedMainOOXXChoice;
        }

        function isAfraidTargetLineText(text) {
            if (currentLang !== 'tw') return false;
            return AFRAID_TARGET_LINES_TW.has((text || '').trim());
        }

        function shouldUseAfraidForChoice(sourceIndices) {
            if (currentLang !== 'tw') return false;
            const choiceTitle = l10n[currentLang]?.choiceTitle || '';
            if (choiceTitle !== AFRAID_TARGET_CHOICE_TITLE_TW) return false;
            return sameChoiceSourceIndices(sourceIndices, DEFAULT_CHOICE_SOURCE_INDICES)
                || sameChoiceSourceIndices(sourceIndices, FOLLOWUP_CHOICE_SOURCE_INDICES);
        }

        function setCharState(state) {
            charIdle.classList.remove('active');
            charBlink.classList.remove('active');
            charSpeak.classList.remove('active');
            if (charAngry) charAngry.classList.remove('active');
            if (charHappy) charHappy.classList.remove('active');
            if (charHappyTalk) charHappyTalk.classList.remove('active');

            if (isAngry) {
                if (sceneSupportsSpecialHeads && charAngry) charAngry.classList.add('active');
                else charIdle.classList.add('active');
                return;
            }
            if (isHappy) {
                if ((isShyBedTransitionMode || isMoneyIntermission) && state === 'blink') {
                    charBlink.classList.add('active');
                    return;
                }
                if (sceneSupportsSpecialHeads && charHappy) {
                    if (isHappyTalkMode && happyMouthOpen && charHappyTalk) charHappyTalk.classList.add('active');
                    else charHappy.classList.add('active');
                }
                else charIdle.classList.add('active');
                return;
            }

            if (state === 'idle') charIdle.classList.add('active');
            else if (state === 'blink') charBlink.classList.add('active');
            else if (state === 'speak') charSpeak.classList.add('active');
            else if (state === 'angry') {
                if (sceneSupportsSpecialHeads && charAngry) charAngry.classList.add('active');
                else charIdle.classList.add('active');
            }
            else if (state === 'happy') {
                if (sceneSupportsSpecialHeads && charHappy) {
                    if (isHappyTalkMode && happyMouthOpen && charHappyTalk) charHappyTalk.classList.add('active');
                    else charHappy.classList.add('active');
                }
                else charIdle.classList.add('active');
            }
            else if (state === 'happyTalk') {
                if (sceneSupportsSpecialHeads && charHappyTalk) charHappyTalk.classList.add('active');
                else if (sceneSupportsSpecialHeads && charHappy) charHappy.classList.add('active');
                else charIdle.classList.add('active');
            }
        }

        function getStoryText(key, fallback = '') {
            return (storyEngine && storyEngine.getTextByKey(key, currentLang)) || fallback;
        }

        function getFightTextBundle() {
            return FIGHT_TEXT[currentLang] || FIGHT_TEXT.tw;
        }

        function getFightChoiceLabel() {
            return FIGHT_CHOICE_LABELS[currentLang] || FIGHT_CHOICE_LABELS.tw;
        }

        function getOpeningTextBundle() {
            return OPENING_TEXT[currentLang] || OPENING_TEXT.tw;
        }

        function getHeadTouchTextBundle() {
            return HEAD_TOUCH_TEXT[currentLang] || HEAD_TOUCH_TEXT.tw;
        }

        function applyDefaultSceneHeadByContext() {
            if (activeSceneId !== SCENE_DEFAULT) return;
            if (!charIdle || !charBlink || !charSpeak) return;
            if (isAfraidHeadMode) {
                charIdle.src = AFRAID_HEADS.idle;
                charBlink.src = AFRAID_HEADS.blink;
                charSpeak.src = AFRAID_HEADS.speak;
                return;
            }
            if (isOpeningPrologueActive) {
                charIdle.src = OPENING_HEADS.idle;
                charBlink.src = OPENING_HEADS.blink;
                charSpeak.src = OPENING_HEADS.speak;
                return;
            }
            const cfg = SCENE_CONFIG[SCENE_DEFAULT];
            charIdle.src = cfg.idle;
            charBlink.src = cfg.blink;
            charSpeak.src = cfg.speak;
        }

        function applyHeadTouchMildNeutralHeads() {
            if (activeSceneId !== SCENE_DEFAULT) return;
            if (!charIdle || !charBlink || !charSpeak) return;
            const cfg = SCENE_CONFIG[SCENE_DEFAULT];
            charIdle.src = cfg.idle;
            charBlink.src = cfg.blink;
            charSpeak.src = cfg.speak;
            setCharState('idle');
        }

        function isHeadTouchAngryFaceActive() {
            return headTouchInterruptFaceMode === 'angry' && (headTouchInterruptActive || headTouchAwaitResumeClick);
        }

        function stopHeadTouchAngryBlinkLoop() {
            if (headTouchAngryBlinkTimer) {
                clearTimeout(headTouchAngryBlinkTimer);
                headTouchAngryBlinkTimer = null;
            }
            if (headTouchAngryBlinkHoldTimer) {
                clearTimeout(headTouchAngryBlinkHoldTimer);
                headTouchAngryBlinkHoldTimer = null;
            }
            if (headTouchAngryRestoreTimer) {
                clearTimeout(headTouchAngryRestoreTimer);
                headTouchAngryRestoreTimer = null;
            }
        }

        function scheduleHeadTouchAngryBlink() {
            stopHeadTouchAngryBlinkLoop();
            if (!isHeadTouchAngryFaceActive() || !headTouchFaceEl) return;
            const delayMs = Math.round(
                HEAD_TOUCH_ANGRY_BLINK_MIN_MS
                + Math.random() * (HEAD_TOUCH_ANGRY_BLINK_MAX_MS - HEAD_TOUCH_ANGRY_BLINK_MIN_MS)
            );
            headTouchAngryBlinkTimer = setTimeout(() => {
                headTouchAngryBlinkTimer = null;
                if (!isHeadTouchAngryFaceActive() || !headTouchFaceEl) return;
                headTouchFaceEl.src = HEAD_TOUCH_ASSETS.angryBlink || HEAD_TOUCH_ASSETS.angry;
                headTouchAngryBlinkHoldTimer = setTimeout(() => {
                    headTouchAngryBlinkHoldTimer = null;
                    if (!isHeadTouchAngryFaceActive() || !headTouchFaceEl) return;
                    headTouchFaceEl.src = HEAD_TOUCH_ASSETS.angry;
                    scheduleHeadTouchAngryBlink();
                }, HEAD_TOUCH_ANGRY_BLINK_HOLD_MS);
            }, delayMs);
        }

        function startHeadTouchAngryBlinkLoop() {
            if (!headTouchFaceEl) return;
            headTouchFaceEl.src = HEAD_TOUCH_ASSETS.angry;
            headTouchFaceEl.classList.add('active');
            scheduleHeadTouchAngryBlink();
        }

        function flashHeadTouchThenRestoreAngry() {
            showHeadTouchFace('angry-touch');
            if (headTouchAngryRestoreTimer) {
                clearTimeout(headTouchAngryRestoreTimer);
                headTouchAngryRestoreTimer = null;
            }
            headTouchAngryRestoreTimer = setTimeout(() => {
                headTouchAngryRestoreTimer = null;
                if (!isHeadTouchAngryFaceActive()) return;
                showHeadTouchFace('angry', { sticky: true });
                startHeadTouchAngryBlinkLoop();
            }, HEAD_TOUCH_FACE_FLASH_MS);
        }

        function hideHeadTouchFace() {
            stopHeadTouchAngryBlinkLoop();
            if (headTouchRestoreTimer) {
                clearTimeout(headTouchRestoreTimer);
                headTouchRestoreTimer = null;
            }
            if (headTouchFaceEl) headTouchFaceEl.classList.remove('active');
        }

        function showHeadTouchFace(mode = 'normal', { sticky = false } = {}) {
            if (!headTouchFaceEl) return;
            hideHeadTouchFace();
            if (mode === 'angry') headTouchFaceEl.src = HEAD_TOUCH_ASSETS.angry;
            else if (mode === 'angry-touch') headTouchFaceEl.src = HEAD_TOUCH_ASSETS.angryTouch || HEAD_TOUCH_ASSETS.normal;
            else headTouchFaceEl.src = HEAD_TOUCH_ASSETS.normal;
            headTouchFaceEl.classList.add('active');
            if (!sticky) {
                headTouchRestoreTimer = setTimeout(() => {
                    if (headTouchFaceEl) headTouchFaceEl.classList.remove('active');
                    headTouchRestoreTimer = null;
                }, 220);
            }
        }

        function playHeadTouchBump() {
            if (!characterContainerEl) return;
            characterContainerEl.classList.remove('head-touch-bump');
            void characterContainerEl.offsetWidth;
            characterContainerEl.classList.add('head-touch-bump');
        }

        function resetHeadTouchChain(reason = '') {
            headTouchStage = 0;
            headTouchTapCount = 0;
            headTouchInterruptActive = false;
            headTouchAwaitResumeClick = false;
            headTouchInterruptFaceMode = 'normal';
            headTouchSnapshot = null;
            hideHeadTouchFace();
            if (reason) debugLog(`[HEAD_TOUCH] reset (${reason})`);
        }

        function canTriggerHeadTouch() {
            if (!headTouchZoneEl || !characterContainerEl) return false;
            if (activeSceneId !== SCENE_DEFAULT) return false;
            if (isOpeningDialogueLocked) return false;
            if (isOpeningGreetingHeadTouchLocked) return false;
            if (isDeathSequence || isMoneyIntermission) return false;
            if (headTouchInterruptActive || headTouchAwaitResumeClick) return false;
            if (appState) {
                const state = appState.getState();
                if (state !== GAME_STATES.DIALOGUE && state !== GAME_STATES.CHOICE) return false;
            }
            if (overlay && overlay.classList.contains('open')) return false;
            if (mapOverlay && !mapOverlay.classList.contains('hidden')) return false;
            if (histOverlay && !histOverlay.classList.contains('hidden')) return false;
            const deathScreen = document.getElementById('death-screen');
            if (deathScreen && !deathScreen.classList.contains('hidden')) return false;
            if (toBeContinuedEl && !toBeContinuedEl.classList.contains('hidden')) return false;
            if (petFoxScreenEl && !petFoxScreenEl.classList.contains('hidden')) return false;
            const ooxxScreen = document.getElementById('ooxx-screen');
            if (ooxxScreen && !ooxxScreen.classList.contains('hidden')) return false;
            const ooxxResult = document.getElementById('ooxx-result');
            if (ooxxResult && !ooxxResult.classList.contains('hidden')) return false;
            return true;
        }

        function snapshotCurrentDialogue() {
            return {
                speaker: speakerPlate.textContent || '',
                typedText: dialogueText.textContent || '',
                wasTyping: isTyping,
                lineIndex,
                charIndex,
                fullLineText: currentDialogueLineText || l10n[currentLang]?.lines?.[lineIndex] || dialogueText.textContent || ''
            };
        }

        function pauseDialogueForHeadTouch() {
            if (!headTouchSnapshot) {
                headTouchSnapshot = snapshotCurrentDialogue();
            }
            clearInterval(typeTimer);
            typeTimer = null;
            setTyping(false);
        }

        function restoreHeadTouchSnapshot() {
            const snapshot = headTouchSnapshot;
            headTouchSnapshot = null;
            headTouchInterruptActive = false;
            headTouchAwaitResumeClick = false;
            headTouchInterruptFaceMode = 'normal';
            hideHeadTouchFace();
            applyDefaultSceneHeadByContext();
            if (!snapshot) return;

            lineIndex = snapshot.lineIndex;
            speakerPlate.textContent = snapshot.speaker;
            const fullLineText = snapshot.fullLineText || snapshot.typedText || '';
            currentDialogueLineText = fullLineText;

            if (!fullLineText) {
                dialogueText.textContent = '';
                setTyping(false);
                applyAfraidHeadMode(false);
                return;
            }

            dialogueText.textContent = '';
            charIndex = 0;
            applyAfraidHeadMode(isAfraidTargetLineText(fullLineText));
            setTyping(true);
            clearInterval(typeTimer);
            typeTimer = setInterval(() => {
                if (charIndex < fullLineText.length) {
                    dialogueText.textContent += fullLineText[charIndex++];
                    playTap();
                } else {
                    clearInterval(typeTimer);
                    typeTimer = null;
                    setTyping(false);
                    if (!dialogueHistory.some(r => r.text === fullLineText && (!r.isChoice))) {
                        dialogueHistory.push({ speaker: snapshot.speaker, text: fullLineText, isChoice: false });
                    }
                    if (snapshot.wasTyping && autoPlay && lineIndex < script.length - 1) setTimeout(nextLine, 1800);
                }
            }, textSpeedMs);
        }

        function rememberCurrentLineText(text) {
            currentDialogueLineText = typeof text === 'string' ? text : '';
        }

        function runHeadTouchInsertedLine({ text, waitClickResume = false, resumeDelayMs = 0, faceMode = 'normal' } = {}) {
            if (!text) {
                if (waitClickResume) headTouchAwaitResumeClick = true;
                else if (resumeDelayMs > 0) setTimeout(restoreHeadTouchSnapshot, resumeDelayMs);
                else restoreHeadTouchSnapshot();
                return;
            }

            const keepIdleFace = faceMode !== 'angry';
            pauseDialogueForHeadTouch();
            headTouchInterruptActive = true;
            headTouchAwaitResumeClick = false;
            stopHeadTouchAngryBlinkLoop();
            headTouchInterruptFaceMode = faceMode === 'angry' ? 'angry' : (faceMode === 'mild' ? 'mild' : 'normal');
            if (headTouchInterruptFaceMode === 'angry') {
                showHeadTouchFace('angry', { sticky: true });
                startHeadTouchAngryBlinkLoop();
            } else if (headTouchInterruptFaceMode === 'mild') {
                hideHeadTouchFace();
                applyHeadTouchMildNeutralHeads();
            } else {
                hideHeadTouchFace();
                setCharState('idle');
            }

            let insertIndex = 0;
            speakerPlate.textContent = l10n[currentLang]?.speaker || speakerPlate.textContent;
            dialogueText.textContent = '';
            setTyping(!keepIdleFace);
            clearInterval(typeTimer);
            typeTimer = setInterval(() => {
                if (insertIndex < text.length) {
                    dialogueText.textContent += text[insertIndex++];
                    playTap();
                } else {
                    clearInterval(typeTimer);
                    typeTimer = null;
                    setTyping(false);
                    if (text) {
                        dialogueHistory.push({ speaker: l10n[currentLang]?.speaker || '', text, isChoice: false });
                    }
                    if (waitClickResume) {
                        headTouchInterruptActive = false;
                        headTouchAwaitResumeClick = true;
                        if (faceMode === 'angry') {
                            showHeadTouchFace('angry', { sticky: true });
                            startHeadTouchAngryBlinkLoop();
                        } else if (faceMode === 'mild') {
                            applyHeadTouchMildNeutralHeads();
                        } else {
                            headTouchInterruptFaceMode = 'normal';
                            hideHeadTouchFace();
                            setCharState('idle');
                        }
                        return;
                    }
                    if (resumeDelayMs > 0) {
                        setTimeout(() => {
                            restoreHeadTouchSnapshot();
                        }, resumeDelayMs);
                        return;
                    }
                    restoreHeadTouchSnapshot();
                }
            }, textSpeedMs);
        }

        function handleHeadTouchAction(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            if (headTouchInterruptActive) {
                playHeadTouchBump();
                if (headTouchInterruptFaceMode === 'angry') {
                    flashHeadTouchThenRestoreAngry();
                } else {
                    showHeadTouchFace('normal');
                    if (headTouchInterruptFaceMode === 'mild') {
                        applyHeadTouchMildNeutralHeads();
                    }
                }
                return;
            }

            const headTouchText = getHeadTouchTextBundle();

            if (headTouchAwaitResumeClick && !isTyping) {
                playHeadTouchBump();
                if (headTouchStage >= 2) {
                    flashHeadTouchThenRestoreAngry();
                } else {
                    showHeadTouchFace('normal');
                    applyHeadTouchMildNeutralHeads();
                }
                headTouchTapCount += 1;
                if (headTouchStage === 1 && headTouchTapCount >= HEAD_TOUCH_THRESHOLDS.second) {
                    headTouchStage = 2;
                    headTouchTapCount = 0;
                    runHeadTouchInsertedLine({ text: headTouchText.angry, waitClickResume: true, faceMode: 'angry' });
                    return;
                }
                if (headTouchStage === 2 && headTouchTapCount >= HEAD_TOUCH_THRESHOLDS.fatal) {
                    resetHeadTouchChain('fatal');
                    dispatchAction('trigger_death', { delayMs: 0, overrideDeathText: headTouchText.fatal });
                }
                return;
            }

            if (!canTriggerHeadTouch()) return;

            playHeadTouchBump();
            showHeadTouchFace('normal');

            headTouchTapCount += 1;
            if (headTouchStage === 0 && headTouchTapCount >= HEAD_TOUCH_THRESHOLDS.first) {
                headTouchStage = 1;
                headTouchTapCount = 0;
                runHeadTouchInsertedLine({
                    text: headTouchText.mild,
                    waitClickResume: true,
                    faceMode: 'mild'
                });
                return;
            }
            if (headTouchStage === 1 && headTouchTapCount >= HEAD_TOUCH_THRESHOLDS.second) {
                headTouchStage = 2;
                headTouchTapCount = 0;
                runHeadTouchInsertedLine({ text: headTouchText.angry, waitClickResume: true, faceMode: 'angry' });
                return;
            }
            if (headTouchStage === 2 && headTouchTapCount >= HEAD_TOUCH_THRESHOLDS.fatal) {
                resetHeadTouchChain('fatal');
                dispatchAction('trigger_death', { delayMs: 0, overrideDeathText: headTouchText.fatal });
            }
        }

        function clearFightVisualFx() {
            fightFx.clearVisualFx();
        }

        function applyFightTailPivotFromSource() {
            if (!charTail || activeSceneId !== SCENE_FIGHT) return;
            const boxWidth = charTail.clientWidth;
            const boxHeight = charTail.clientHeight;
            if (!boxWidth || !boxHeight) return;

            const sourceWidth = charIdle?.naturalWidth || FIGHT_SOURCE_FALLBACK_SIZE.width;
            const sourceHeight = charIdle?.naturalHeight || FIGHT_SOURCE_FALLBACK_SIZE.height;
            if (!sourceWidth || !sourceHeight) return;

            const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
            const renderWidth = sourceWidth * scale;
            const renderHeight = sourceHeight * scale;
            const offsetX = (boxWidth - renderWidth) * FIGHT_SCENE_OBJECT_POSITION.x;
            const offsetY = (boxHeight - renderHeight) * FIGHT_SCENE_OBJECT_POSITION.y;

            const originX = offsetX + FIGHT_TAIL_PIVOT_SOURCE.x * scale;
            const originY = offsetY + FIGHT_TAIL_PIVOT_SOURCE.y * scale;
            charTail.style.setProperty('--tail-origin', `${originX.toFixed(2)}px ${originY.toFixed(2)}px`);
        }

        function applyOpeningHeadMode(flag) {
            isOpeningPrologueActive = !!flag;
            if (activeSceneId !== SCENE_DEFAULT) return;
            if (!charIdle || !charBlink || !charSpeak) return;
            if (isOpeningPrologueActive) {
                charIdle.src = OPENING_HEADS.idle;
                charBlink.src = OPENING_HEADS.blink;
                charSpeak.src = OPENING_HEADS.speak;
            } else {
                const cfg = SCENE_CONFIG[SCENE_DEFAULT];
                charIdle.src = cfg.idle;
                charBlink.src = cfg.blink;
                charSpeak.src = cfg.speak;
            }
            setCharState(isTyping ? 'speak' : 'idle');
        }

        function applyAfraidHeadMode(flag) {
            const enable = Boolean(flag) && activeSceneId === SCENE_DEFAULT;
            // Ignore disable calls when afraid mode is not active, so other
            // temporary head modes (e.g. shy transition) are not overwritten.
            if (!enable && !isAfraidHeadMode) return;
            isAfraidHeadMode = enable;
            if (activeSceneId !== SCENE_DEFAULT) return;
            if (!charIdle || !charBlink || !charSpeak) return;
            if (enable) {
                charIdle.src = AFRAID_HEADS.idle;
                charBlink.src = AFRAID_HEADS.blink;
                charSpeak.src = AFRAID_HEADS.speak;
            } else if (isOpeningPrologueActive) {
                charIdle.src = OPENING_HEADS.idle;
                charBlink.src = OPENING_HEADS.blink;
                charSpeak.src = OPENING_HEADS.speak;
            } else {
                const cfg = SCENE_CONFIG[SCENE_DEFAULT];
                charIdle.src = cfg.idle;
                charBlink.src = cfg.blink;
                charSpeak.src = cfg.speak;
            }
            setCharState(isTyping ? 'speak' : 'idle');
        }

        function applyShyBedTransitionHeadMode(flag) {
            const enable = Boolean(flag) && activeSceneId === SCENE_DEFAULT;
            isShyBedTransitionMode = enable;
            if (!charHappy || !charHappyTalk || !charBlink) return;
            const cfg = SCENE_CONFIG[activeSceneId] || SCENE_CONFIG[SCENE_DEFAULT];
            if (enable) {
                charHappy.src = SHY_BED_TRANSITION_HEADS.happy;
                charHappyTalk.src = SHY_BED_TRANSITION_HEADS.speak;
                charBlink.src = SHY_BED_TRANSITION_HEADS.blink;
            } else {
                charHappy.src = cfg.happy || SCENE_CONFIG[SCENE_DEFAULT].happy;
                charHappyTalk.src = cfg.happyTalk || cfg.happy || SCENE_CONFIG[SCENE_DEFAULT].happy;
                if (activeSceneId === SCENE_DEFAULT && isAfraidHeadMode) {
                    charBlink.src = AFRAID_HEADS.blink;
                } else if (activeSceneId === SCENE_DEFAULT && isOpeningPrologueActive) {
                    charBlink.src = OPENING_HEADS.blink;
                } else {
                    charBlink.src = cfg.blink || SCENE_CONFIG[SCENE_DEFAULT].blink;
                }
            }
            if (isHappy) setCharState(isTyping ? 'speak' : 'idle');
        }

        function syncHeadphoneLayer() {
            if (!charHeadphone || !charBody) return;
            const bodySrc = charBody.getAttribute('src') || '';
            if (bodySrc.includes('body-main.png')) {
                if (charHeadphone.getAttribute('src') !== 'assets/images/scenes/default/headphone.png') {
                    charHeadphone.src = 'assets/images/scenes/default/headphone.png';
                }
                charHeadphone.classList.add('active');
                return;
            }
            if (bodySrc.includes('bed-body.png')) {
                if (charHeadphone.getAttribute('src') !== 'assets/images/scenes/bed/bed-headphone.png') {
                    charHeadphone.src = 'assets/images/scenes/bed/bed-headphone.png';
                }
                charHeadphone.classList.add('active');
                return;
            }
            if (bodySrc.includes('fight-fox-notail.png')) {
                if (charHeadphone.getAttribute('src') !== 'assets/images/scenes/fight/fight-headphone.png') {
                    charHeadphone.src = 'assets/images/scenes/fight/fight-headphone.png';
                }
                charHeadphone.classList.add('active');
                return;
            }
            charHeadphone.classList.remove('active');
        }

        function getSceneGameTitle(uiBundle) {
            const ui = uiBundle || l10n[currentLang]?.ui;
            if (!ui) return '';
            if (activeSceneId === SCENE_BED) return ui.bedGameTitle || '提爾家';
            return ui.gameTitle || '';
        }

        function applySceneTopTitle() {
            const titleEl = document.querySelector('.lang-ui-gameTitle');
            if (!titleEl) return;
            const title = getSceneGameTitle();
            if (title) titleEl.textContent = title;
        }

        function applyScene(sceneId) {
            const cfg = SCENE_CONFIG[sceneId] || SCENE_CONFIG[SCENE_DEFAULT];
            const nextSceneId = sceneId in SCENE_CONFIG ? sceneId : SCENE_DEFAULT;
            if (nextSceneId !== activeSceneId) {
                resetHeadTouchChain('scene_change');
            }
            activeSceneId = nextSceneId;
            sceneSupportsSpecialHeads = cfg.hasSpecialHeads !== false;
            bedHeadVariant = 'normal';
            isHappyTalkMode = false;
            happyMouthOpen = false;
            if (bgEl) bgEl.style.backgroundImage = `url('${cfg.bg}')`;
            if (bgSplashEl) bgSplashEl.style.backgroundImage = `url('${cfg.bg}')`;
            if (charTail) charTail.src = cfg.tail;
            if (charBody) charBody.src = cfg.body;
            if (charIdle) charIdle.src = cfg.idle;
            if (charBlink) charBlink.src = cfg.blink;
            if (charSpeak) charSpeak.src = cfg.speak;
            if (activeSceneId === SCENE_DEFAULT && isOpeningPrologueActive) {
                if (charIdle) charIdle.src = OPENING_HEADS.idle;
                if (charBlink) charBlink.src = OPENING_HEADS.blink;
                if (charSpeak) charSpeak.src = OPENING_HEADS.speak;
            }
            if (activeSceneId === SCENE_DEFAULT && isAfraidHeadMode) {
                if (charIdle) charIdle.src = AFRAID_HEADS.idle;
                if (charBlink) charBlink.src = AFRAID_HEADS.blink;
                if (charSpeak) charSpeak.src = AFRAID_HEADS.speak;
            }
            if (charAngry) charAngry.src = cfg.angry;
            if (charHappy) charHappy.src = cfg.happy;
            if (charHappyTalk) charHappyTalk.src = cfg.happyTalk || cfg.happy;
            if (activeSceneId === SCENE_DEFAULT && isShyBedTransitionMode) {
                if (charHappy) charHappy.src = SHY_BED_TRANSITION_HEADS.happy;
                if (charHappyTalk) charHappyTalk.src = SHY_BED_TRANSITION_HEADS.speak;
                if (charBlink) charBlink.src = SHY_BED_TRANSITION_HEADS.blink;
            }
            if (charTail) {
                charTail.style.setProperty('--tail-origin', cfg.tailOrigin || SCENE_CONFIG[SCENE_DEFAULT].tailOrigin);
                charTail.classList.remove('tail-burst');
            }
            if (gameContainerEl) {
                gameContainerEl.classList.toggle('scene-bed', activeSceneId === SCENE_BED);
                gameContainerEl.classList.toggle('scene-fight', activeSceneId === SCENE_FIGHT);
            }
            if (activeSceneId === SCENE_FIGHT) {
                requestAnimationFrame(() => applyFightTailPivotFromSource());
            }
            syncHeadphoneLayer();
            setCharState('idle');
            applySceneTopTitle();
        }

        function applyMoneyHeadState(showing) {
            if (!charHappy) return;
            const cfg = SCENE_CONFIG[activeSceneId] || SCENE_CONFIG[SCENE_DEFAULT];
            const normalHappy = isShyBedTransitionMode
                ? SHY_BED_TRANSITION_HEADS.happy
                : (cfg.happy || SCENE_CONFIG[SCENE_DEFAULT].happy);
            const normalBlink = isShyBedTransitionMode
                ? SHY_BED_TRANSITION_HEADS.blink
                : (activeSceneId === SCENE_DEFAULT && isAfraidHeadMode)
                    ? AFRAID_HEADS.blink
                    : (activeSceneId === SCENE_DEFAULT && isOpeningPrologueActive)
                        ? OPENING_HEADS.blink
                        : (cfg.blink || SCENE_CONFIG[SCENE_DEFAULT].blink);
            const moneyHappy = cfg.moneyHead || normalHappy;
            const moneyBlink = cfg.moneyBlink || normalBlink;
            charHappy.src = showing ? moneyHappy : normalHappy;
            if (charBlink) charBlink.src = showing ? moneyBlink : normalBlink;
            if (isHappy) setCharState('happy');
        }

        function applyBedHeadVariant(variant) {
            if (activeSceneId !== SCENE_BED) return;
            const cfg = SCENE_CONFIG[SCENE_BED];
            bedHeadVariant = (
                variant === 'eyes_closed' ||
                variant === 'eyes_closed_cry' ||
                variant === 'tears'
            ) ? variant : 'normal';
            if (!charIdle || !charBlink || !charSpeak) return;
            if (bedHeadVariant === 'eyes_closed') {
                charIdle.src = cfg.idleClosed || cfg.idle;
                charSpeak.src = cfg.speakClosed || cfg.speak;
                charBlink.src = cfg.idleClosed || cfg.blink;
            } else if (bedHeadVariant === 'eyes_closed_cry') {
                charIdle.src = cfg.idleClosedCry || cfg.idleClosed || cfg.idle;
                charSpeak.src = cfg.speakClosedCry || cfg.speakClosed || cfg.speak;
                charBlink.src = cfg.idleClosedCry || cfg.idleClosed || cfg.blink;
            } else if (bedHeadVariant === 'tears') {
                // Asset naming is intentionally inverted for this interaction.
                charIdle.src = cfg.speakTears || cfg.idle;
                charSpeak.src = cfg.idleTears || cfg.speak;
                charBlink.src = cfg.blinkSpeakTears || cfg.idleClosedCry || cfg.idleClosed || cfg.blink;
            } else {
                charIdle.src = cfg.idle;
                charSpeak.src = cfg.speak;
                charBlink.src = cfg.blink;
            }
            setCharState(isTyping ? 'speak' : 'idle');
        }

        function resetBedFlow() {
            bedFlow.active = false;
            bedFlow.phase = 'none';
            bedFlow.tailOptionRemoved = false;
            bedFlow.continueTouchCount = 0;
            bedFlow.tearsAfterStop = false;
        }

        function hideChoicePanel() {
            inChoiceMode = false;
            dialogueController.setChoiceMode(false);
            choiceController.hide();
            if (isAfraidHeadMode) applyAfraidHeadMode(false);
            clearChoicePressedState();
            syncMobileChoiceUi();
        }

        function playTailWagBurst() {
            if (!charTail) return;
            charTail.classList.remove('tail-burst');
            void charTail.offsetWidth;
            charTail.classList.add('tail-burst');
            setTimeout(() => {
                charTail.classList.remove('tail-burst');
            }, BED_TAIL_BURST_RESET_MS);
        }

        function setChoiceButtons(sourceIndices) {
            const t = l10n[currentLang];
            if (!t) return;
            currentChoiceSourceIndices = sourceIndices.slice();
            isRuntimeChoiceMode = false;
            runtimeChoiceState = null;
            clearChoicePressedState();

            const labelEl = choicePanel.querySelector('.choice-label');
            if (labelEl) labelEl.textContent = t.choiceTitle;
            dialogueUI.renderChoiceTexts(
                t.choiceTitle,
                sourceIndices.map((sourceIndex) => {
                    if (typeof sourceIndex !== 'number') return '';
                    if (isMainChoiceOptionDisabled(sourceIndex)) return '';
                    let text = t.choices[sourceIndex] || '';
                    if (
                        sourceIndex === 1 &&
                        sameChoiceSourceIndices(sourceIndices, DEFAULT_CHOICE_SOURCE_INDICES)
                    ) {
                        text = getFightChoiceLabel();
                    }
                    return text;
                })
            );

            choiceButtonEls.forEach((btn, slotIndex) => {
                const sourceIndex = sourceIndices[slotIndex];
                const numEl = btn.querySelector('.choice-num');
                const textEl = btn.querySelector('.choice-text');
                let text = typeof sourceIndex === 'number' ? t.choices[sourceIndex] : '';
                if (
                    typeof sourceIndex === 'number'
                    && sourceIndex === 1
                    && sameChoiceSourceIndices(sourceIndices, DEFAULT_CHOICE_SOURCE_INDICES)
                ) {
                    text = getFightChoiceLabel();
                }
                if (isMainChoiceOptionDisabled(sourceIndex)) {
                    text = '';
                }

                if (typeof sourceIndex !== 'number' || !text) {
                    btn.style.display = 'none';
                    if (btn.dataset) delete btn.dataset.clickSfx;
                    return;
                }

                btn.style.display = '';
                if (btn.dataset) delete btn.dataset.clickSfx;
                if (numEl) numEl.textContent = String(slotIndex + 1);
                if (textEl) textEl.textContent = text;
            });
        }

        function showChoicePanel(sourceIndices = DEFAULT_CHOICE_SOURCE_INDICES) {
            if (appState && appState.getState() !== GAME_STATES.CHOICE) {
                try { appState.transition(GAME_STATES.CHOICE, { source: 'show_choice_panel' }); } catch (e) { }
            }
            inChoiceMode = true;
            dialogueController.setChoiceMode(true);
            choiceController.show();
            applyAfraidHeadMode(shouldUseAfraidForChoice(sourceIndices));
            clearChoicePressedState();
            syncMobileChoiceUi();
            setChoiceButtons(sourceIndices);

            // Preload OOXX UI/AI while user is still on choice screen.
            warmupOOXXEngine();
            prepareOOXXScreen();
        }

        function renderRuntimeChoicePanel() {
            if (!runtimeChoiceState) return;
            const t = l10n[currentLang];
            const labelEl = choicePanel.querySelector('.choice-label');
            const title = runtimeChoiceState.titleKey
                ? getStoryText(
                    runtimeChoiceState.titleKey,
                    runtimeChoiceState.fallbackTitle || t?.choiceTitle || ''
                )
                : (runtimeChoiceState.fallbackTitle || t?.choiceTitle || '');
            if (labelEl) labelEl.textContent = title;

            choiceButtonEls.forEach((btn, slotIndex) => {
                const option = runtimeChoiceState.options[slotIndex];
                const numEl = btn.querySelector('.choice-num');
                const textEl = btn.querySelector('.choice-text');
                if (!option) {
                    btn.style.display = 'none';
                    if (btn.dataset) delete btn.dataset.clickSfx;
                    return;
                }
                btn.style.display = '';
                if (btn.dataset) {
                    if (option.clickSfx) btn.dataset.clickSfx = option.clickSfx;
                    else delete btn.dataset.clickSfx;
                }
                if (numEl) numEl.textContent = String(slotIndex + 1);
                if (textEl) textEl.textContent = getStoryText(option.textKey, option.fallbackText || '');
            });
        }

        function showRuntimeChoicePanel({ titleKey, options, fallbackTitle = '' }) {
            runtimeChoiceState = {
                titleKey,
                fallbackTitle,
                options: options.slice()
            };
            isRuntimeChoiceMode = true;
            if (appState && appState.getState() !== GAME_STATES.CHOICE) {
                try { appState.transition(GAME_STATES.CHOICE, { source: 'runtime_choice' }); } catch (e) { }
            }
            inChoiceMode = true;
            dialogueController.setChoiceMode(true);
            choiceController.show();
            applyAfraidHeadMode(false);
            clearChoicePressedState();
            syncMobileChoiceUi();
            renderRuntimeChoicePanel();
            warmupOOXXEngine();
            prepareOOXXScreen();
        }

        function handleRuntimeChoice(slotIndex) {
            if (!runtimeChoiceState) return;
            const option = runtimeChoiceState.options[slotIndex];
            if (!option || typeof option.onSelect !== 'function') return;
            const choiceText = getStoryText(option.textKey, option.fallbackText || '');
            if (choiceText) {
                dialogueHistory.push({ speaker: '', text: choiceText, isChoice: true });
            }
            isRuntimeChoiceMode = false;
            runtimeChoiceState = null;
            hideChoicePanel();
            option.onSelect();
        }

        function playFightHitFx() {
            playPunchSfx();
            fightFx.playHitShake();
            fightFx.playDamagePop('-20');

            isAngry = true;
            setCharState('angry');
            setTimeout(() => {
                isAngry = false;
                setCharState(isTyping ? 'speak' : 'idle');
            }, 320);
        }

        function playFightRedFlashPulse() {
            return new Promise(resolve => {
                if (!fightRedFlashEl) {
                    setTimeout(resolve, 220);
                    return;
                }
                fightFx.playRedFlash();
                setTimeout(() => {
                    fightRedFlashEl.classList.remove('flash');
                    resolve();
                }, 220);
            });
        }

        async function playFightRedFlashTwice() {
            await playFightRedFlashPulse();
            await new Promise(resolve => setTimeout(resolve, 100));
            await playFightRedFlashPulse();
        }

        function showFightOptions() {
            const fight = getFightTextBundle();
            showRuntimeChoicePanel({
                titleKey: '',
                fallbackTitle: fight.choiceTitle,
                options: [
                    { textKey: '', fallbackText: fight.attackOption, onSelect: onFightAttack, clickSfx: 'none' },
                    { textKey: '', fallbackText: fight.jokeOption, onSelect: onFightJoke }
                ]
            });
        }

        async function startFightEncounter() {
            isFightSequenceActive = true;
            isDeathSequence = false;
            setTyping(false);
            pendingClickAdvance = null;
            pendingPostChoiceAction = null;
            applyAfraidHeadMode(false);
            resetMoneyIntermission();
            hideChoicePanel();
            const fight = getFightTextBundle();
            const startFightIntro = () => runScriptedLine(fight.intro, l10n[currentLang]?.speaker || '', showFightOptions);

            if (appState && appState.getState() !== GAME_STATES.TRANSITION) {
                try { appState.transition(GAME_STATES.TRANSITION, { source: 'fight_entry' }); } catch (e) { }
            }

            try {
                const result = await ooxxTransitionEngine.runCurtainTransition({
                    id: 'fight-entry',
                    fadeInMs: FIGHT_ENTRY_TRANSITION.fadeInMs,
                    holdMs: FIGHT_ENTRY_TRANSITION.holdMs,
                    fadeOutMs: FIGHT_ENTRY_TRANSITION.fadeOutMs,
                    onBlack: async () => {
                        applyScene(SCENE_FIGHT);
                    }
                });
                if (!result || result.cancelled) {
                    applyScene(SCENE_FIGHT);
                }
            } catch (err) {
                console.error('Fight entry transition error:', err);
                applyScene(SCENE_FIGHT);
            }

            if (appState && appState.getState() !== GAME_STATES.DIALOGUE) {
                try { appState.transition(GAME_STATES.DIALOGUE, { source: 'fight_entry' }); } catch (e) { }
            }

            startFightIntro();
        }

        function onFightAttack() {
            const fight = getFightTextBundle();
            setTyping(false);
            isDeathSequence = true;
            playFightHitFx();
            runScriptedLines(
                [fight.afterHitLine1, fight.afterHitLine2],
                l10n[currentLang]?.speaker || '',
                () => {
                    playFightRedFlashTwice().then(() => {
                        dispatchAction('trigger_death', { delayMs: 0 });
                    });
                },
                { requireClickBetweenLines: true }
            );
        }

        async function onFightJoke() {
            isFightSequenceActive = false;
            isDeathSequence = false;
            setTyping(false);
            clearFightVisualFx();
            const line = currentLang === 'tw'
                ? '那你到底想要幹麻?'
                : (currentLang === 'jp' ? 'それで、結局何がしたいの？' : 'So what do you actually want?');

            if (appState && appState.getState() !== GAME_STATES.TRANSITION) {
                try { appState.transition(GAME_STATES.TRANSITION, { source: 'fight_exit_joke' }); } catch (e) { }
            }

            try {
                const result = await ooxxTransitionEngine.runCurtainTransition({
                    id: 'fight-exit-joke',
                    fadeInMs: FIGHT_ENTRY_TRANSITION.fadeInMs,
                    holdMs: FIGHT_ENTRY_TRANSITION.holdMs,
                    fadeOutMs: FIGHT_ENTRY_TRANSITION.fadeOutMs,
                    onBlack: async () => {
                        applyScene(SCENE_DEFAULT);
                    }
                });
                if (!result || result.cancelled) {
                    applyScene(SCENE_DEFAULT);
                }
            } catch (err) {
                console.error('Fight exit transition error:', err);
                applyScene(SCENE_DEFAULT);
            }

            if (appState && appState.getState() !== GAME_STATES.DIALOGUE) {
                try { appState.transition(GAME_STATES.DIALOGUE, { source: 'fight_exit_joke' }); } catch (e) { }
            }

            runScriptedLine(
                line,
                l10n[currentLang]?.speaker || '',
                () => showChoicePanel(FOLLOWUP_CHOICE_SOURCE_INDICES)
            );
        }

        if (choicePanel) {
            choicePanel.addEventListener('pointerdown', (e) => {
                const btn = e.target instanceof Element ? e.target.closest('.choice-btn') : null;
                if (!btn) return;
                clearChoicePressedState();
                btn.classList.add('is-pressed');
            });
            const releasePressed = () => clearChoicePressedState();
            choicePanel.addEventListener('pointerup', releasePressed);
            choicePanel.addEventListener('pointercancel', releasePressed);
            choicePanel.addEventListener('pointerleave', releasePressed);
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

        function startHappySpeakingAnimation() {
            if (speakInterval) clearInterval(speakInterval);
            happyMouthOpen = true;
            setCharState('happy');
            speakInterval = setInterval(() => {
                happyMouthOpen = !happyMouthOpen;
                setCharState('happy');
            }, 120);
        }

        function stopSpeakingAnimation() {
            if (speakInterval) {
                clearInterval(speakInterval);
                speakInterval = null;
            }
            happyMouthOpen = false;
        }

        function setTyping(flag) {
            isTyping = flag;
            dialogueText.classList.toggle('typing', flag);

            isSpeaking = flag;

            if (isAngry) {
                stopSpeakingAnimation();
                clearTimeout(blinkTimeout);
                setCharState('angry');
                return;
            }

            if (isHappy) {
                clearTimeout(blinkTimeout);
                if (isHappyTalkMode && isSpeaking) {
                    startHappySpeakingAnimation();
                } else {
                    stopSpeakingAnimation();
                    setCharState('happy');
                    if (isShyBedTransitionMode || isMoneyIntermission) scheduleNextBlink();
                }
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
            dialogueController.setChoiceMode(false);
            choiceController.hide();
            syncMobileChoiceUi();
            if (appState && appState.getState() !== GAME_STATES.DIALOGUE) {
                try { appState.transition(GAME_STATES.DIALOGUE, { source: 'render_line' }); } catch (e) { }
            }
            speakerPlate.textContent = t.speaker;
            dialogueText.textContent = '';
            charIndex = 0;
            const lineText = t.lines[idx];
            rememberCurrentLineText(lineText);
            applyAfraidHeadMode(isAfraidTargetLineText(lineText));
            setTyping(true);
            clearInterval(typeTimer);

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
                if (lineText) {
                    dialogueText.textContent = lineText;
                    rememberCurrentLineText(lineText);
                }
                return;
            }
            if (lineIndex < script.length - 1) {
                resetHeadTouchChain('next_line');
                lineIndex++;
                renderLine(lineIndex);
            } else {
                showToast(l10n[currentLang].ui.toastContinue);
            }
        }

        function prevLine() {
            if (lineIndex > 0) {
                resetHeadTouchChain('prev_line');
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
                    setTimeout(() => triggerDeath({ overrideText: context.overrideDeathText || '' }), context.delayMs ?? 1000);
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
                case 'start_bed_scene':
                    setTimeout(startBedScene, context.delayMs ?? 0);
                    return;
                case 'show_followup_choices':
                    setTimeout(showFollowupChoices, context.delayMs ?? 0);
                    return;
                default:
                    console.warn('[ACTION] Unknown action:', actionId);
            }
        }

        function runScriptedLine(responseText, speakerName, onDone) {
            speakerPlate.textContent = speakerName;
            dialogueText.textContent = '';
            charIndex = 0;
            rememberCurrentLineText(responseText || '');
            applyAfraidHeadMode(isAfraidTargetLineText(responseText));
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
                    if (typeof onDone === 'function') onDone();
                }
            }, textSpeedMs);
        }

        function runChoiceResponse(responseText, actionId, speakerName) {
            runScriptedLine(responseText, speakerName, () => {
                if (actionId === 'show_to_be_continued' || actionId === 'start_bed_scene') {
                    pendingPostChoiceAction = actionId;
                    return;
                }
                if (actionId === 'show_followup_choices') {
                    dispatchAction(actionId, { delayMs: 0 });
                    return;
                }
                dispatchAction(actionId, { delayMs: 1000 });
            });
        }

        function runScriptedLines(lines, speakerName, onDone, options = {}) {
            const requireClickBetweenLines = !!options.requireClickBetweenLines;
            const queue = Array.isArray(lines) ? lines.filter(Boolean) : [];
            pendingClickAdvance = null;
            if (queue.length === 0) {
                if (typeof onDone === 'function') onDone();
                return;
            }
            const playNext = () => {
                const text = queue.shift();
                if (!text) {
                    if (queue.length === 0) {
                        if (typeof onDone === 'function') onDone();
                        return;
                    }
                    playNext();
                    return;
                }
                runScriptedLine(text, speakerName, () => {
                    if (queue.length > 0) {
                        if (requireClickBetweenLines) {
                            pendingClickAdvance = playNext;
                        } else {
                            playNext();
                        }
                    }
                    else if (typeof onDone === 'function') onDone();
                });
            };
            playNext();
        }

        function jumpToMainOpeningStory() {
            pendingClickAdvance = null;
            applyOpeningHeadMode(false);
            lineIndex = 0;
            renderLine(0);
        }

        function showOpeningGoHomeOnlyChoice() {
            const opening = getOpeningTextBundle();
            showRuntimeChoicePanel({
                titleKey: 'choice_title',
                options: [
                    { textKey: '', fallbackText: opening.choiceGoHome, onSelect: jumpToMainOpeningStory }
                ]
            });
        }

        function showOpeningFirstChoice() {
            const opening = getOpeningTextBundle();
            showRuntimeChoicePanel({
                titleKey: 'choice_title',
                options: [
                    {
                        textKey: '',
                        fallbackText: opening.choiceIntro,
                        onSelect: () => runScriptedLines(
                            opening.introLines,
                            l10n[currentLang]?.speaker || '',
                            showOpeningGoHomeOnlyChoice,
                            { requireClickBetweenLines: true }
                        )
                    },
                    { textKey: '', fallbackText: opening.choiceGoHome, onSelect: jumpToMainOpeningStory }
                ]
            });
        }

        function startOpeningPrologue() {
            isOpeningDialogueLocked = false;
            isOpeningGreetingHeadTouchLocked = true;
            applyOpeningHeadMode(true);
            const opening = getOpeningTextBundle();
            runScriptedLine(opening.greeting, l10n[currentLang]?.speaker || '', () => {
                isOpeningGreetingHeadTouchLocked = false;
                showOpeningFirstChoice();
            });
        }

        function pickChoice(idx) {
            hideChoicePanel();
            resetHeadTouchChain('pick_choice');
            if (idx === 3 && hasUsedMainOOXXChoice) return;

            const t = l10n[currentLang];
            if (
                idx === 1
                && !isFightSequenceActive
                && sameChoiceSourceIndices(currentChoiceSourceIndices, DEFAULT_CHOICE_SOURCE_INDICES)
            ) {
                dialogueHistory.push({ speaker: '', text: getFightChoiceLabel(), isChoice: true });
                startFightEncounter();
                return;
            }
            const fallbackActionId = idx === 3
                ? 'start_ooxx'
                : (idx === 2 ? 'start_bed_scene' : (idx === 1 ? 'show_pet_fox' : 'trigger_death'));
            const outcome = storyEngine
                ? storyEngine.getChoiceOutcomeByIndex(idx)
                : { actionId: fallbackActionId, responseText: t.responses[idx] };
            const actionId = outcome?.actionId || fallbackActionId;
            const responseText = outcome?.responseText || '';

            // Add user choice to history
            dialogueHistory.push({ speaker: '', text: t.choices[idx], isChoice: true });

            if (actionId === 'start_ooxx' && !responseText) {
                if (idx === 3) hasUsedMainOOXXChoice = true;
                dispatchAction(actionId);
                return;
            }

            isFightSequenceActive = false;
            isAngry = actionId === 'trigger_death';
            isHappy = actionId === 'show_to_be_continued' || actionId === 'start_bed_scene';
            isHappyTalkMode = actionId === 'start_bed_scene';
            applyShyBedTransitionHeadMode(actionId === 'start_bed_scene');
            if (!isHappy) hideMoneyPopup();
            setCharState(isHappy ? 'happy' : (isAngry ? 'angry' : 'idle'));
            if (actionId === 'show_to_be_continued' || actionId === 'start_bed_scene') {
                setTyping(false);
                beginMoneyIntermission(() => {
                    runChoiceResponse(responseText, actionId, t.speaker);
                });
                return;
            }

            runChoiceResponse(responseText, actionId, t.speaker);
        }

        function showBedPhase1() {
            if (!bedFlow.active) return;
            bedFlow.phase = 'phase1';
            applyBedHeadVariant(bedFlow.tearsAfterStop ? 'tears' : 'normal');
            const options = [];
            if (!bedFlow.tailOptionRemoved) {
                options.push({ textKey: 'bed_choice_tail', onSelect: onBedTailTouched });
            }
            options.push({ textKey: 'bed_choice_thigh', onSelect: onBedTouchThigh });
            if (!hasUsedMainOOXXChoice) {
                options.push({ textKey: 'bed_choice_ooxx', onSelect: onBedStartOOXX });
            }
            showRuntimeChoicePanel({ titleKey: 'choice_title', options });
        }

        function showBedPhase2() {
            if (!bedFlow.active) return;
            bedFlow.phase = 'phase2';
            applyBedHeadVariant(bedFlow.continueTouchCount >= 5 ? 'eyes_closed_cry' : 'eyes_closed');
            showRuntimeChoicePanel({
                titleKey: 'choice_title',
                options: [
                    { textKey: 'bed_choice_continue', onSelect: onBedContinueTouch },
                    { textKey: 'bed_choice_stop', onSelect: onBedStopTouch }
                ]
            });
        }

        function onBedTailTouched() {
            playTailWagBurst();
            bedFlow.continueTouchCount = 0;
            bedFlow.tearsAfterStop = false;
            applyBedHeadVariant('eyes_closed');
            const line = getStoryText('bed_line_2', '嗚...我尾巴很敏感的...你再摸我就要...');
            runScriptedLine(line, l10n[currentLang]?.speaker || '', () => showBedPhase2());
        }

        function onBedContinueTouch() {
            playTailWagBurst();
            bedFlow.continueTouchCount += 1;
            const isCryMode = bedFlow.continueTouchCount >= 5;
            applyBedHeadVariant(isCryMode ? 'eyes_closed_cry' : 'eyes_closed');
            const line = isCryMode
                ? getStoryText('bed_line_continue_cry', '我受不了拉...')
                : getStoryText('bed_line_continue', '嗚嗚....');
            runScriptedLine(line, l10n[currentLang]?.speaker || '', () => showBedPhase2());
        }

        function onBedStopTouch() {
            const shouldUseTears = bedFlow.continueTouchCount >= 5;
            bedFlow.tailOptionRemoved = true;
            bedFlow.continueTouchCount = 0;
            bedFlow.tearsAfterStop = shouldUseTears;
            applyBedHeadVariant(shouldUseTears ? 'tears' : 'normal');
            const fallbackStopLine = BED_STOP_LINE_BY_LANG[currentLang] || BED_STOP_LINE_BY_LANG.tw;
            const line = getStoryText('bed_line_stop', fallbackStopLine);
            runScriptedLine(line, l10n[currentLang]?.speaker || '', () => showBedPhase1());
        }

        function onBedTouchThigh() {
            dispatchAction('trigger_death', { delayMs: 0 });
        }

        function onBedStartOOXX() {
            dispatchAction('start_ooxx');
        }

        async function startBedScene() {
            if (bedFlow.active) return;
            setTyping(false);
            resetMoneyIntermission();
            hideMoneyPopup();
            isDeathSequence = false;
            isAngry = false;
            isHappy = false;
            isHappyTalkMode = false;
            hideChoicePanel();
            if (bgmEl) bgmEl.pause();
            try {
                const result = await ooxxTransitionEngine.runCurtainTransition({
                    id: 'bed-entry',
                    fadeInMs: BED_ENTRY_TRANSITION.fadeInMs,
                    holdMs: BED_ENTRY_TRANSITION.holdMs,
                    fadeOutMs: BED_ENTRY_TRANSITION.fadeOutMs,
                    onBlack: async () => {
                        applyScene(SCENE_BED);
                        isShyBedTransitionMode = false;
                    }
                });
                if (!result || result.cancelled) return;
            } catch (err) {
                console.error('Bed scene transition error:', err);
                return;
            }

            bedFlow.active = true;
            bedFlow.phase = 'phase1';
            bedFlow.tailOptionRemoved = false;
            bedFlow.continueTouchCount = 0;
            bedFlow.tearsAfterStop = false;
            if (appState && appState.getState() !== GAME_STATES.DIALOGUE) {
                try { appState.transition(GAME_STATES.DIALOGUE, { source: 'bed_scene' }); } catch (e) { }
            }
            const line = getStoryText('bed_line_1', '說...說好只能摸尾巴的喔');
            runScriptedLine(line, l10n[currentLang]?.speaker || '', () => showBedPhase1());
        }

        // OOXX mini-game
        let ooxxBoard = [], ooxxLocked = false;
        let ooxxCellElements = [];
        let ooxxPreparedLang = '';
        let ooxxWarmupDone = false;
        let ooxxReturnChoiceSourceIndices = null;

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
        const FIGHT_ENTRY_TRANSITION = { fadeInMs: 450, holdMs: 100, fadeOutMs: 400 };
        const OOXX_ENTRY_TRANSITION = { fadeInMs: 1200, holdMs: 1800, fadeOutMs: 1200 };
        const OOXX_RESULT_TRANSITION = { fadeInMs: 350, holdMs: 120, fadeOutMs: 350 };
        const OOXX_RESULT_REVEAL_DELAY_MS = 120;
        const OOXX_RESULT_TEXT_SHOW_DELAY_MS = 20;
        const OOXX_RESULT_LOCK_RETRY_MS = 80;
        const OOXX_RESULT_LOCK_RETRY_MAX = 50;
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
            debugLog(`[OOXX][${ts}][token:${token}] ${phase}`);
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
            const bindResultClick = (resultEl) => {
                if (!resultEl) return;
                resultEl.addEventListener('click', function once() {
                    resultEl.removeEventListener('click', once);
                    resultEl.classList.remove('show-text'); // reset for next time
                    if (Array.isArray(ooxxReturnChoiceSourceIndices) && ooxxReturnChoiceSourceIndices.length > 0) {
                        resultEl.classList.add('hidden');
                        isDeathSequence = false;
                        isFightSequenceActive = false;
                        setTyping(false);
                        resetMoneyIntermission();
                        startBGM();
                        showChoicePanel(ooxxReturnChoiceSourceIndices);
                        ooxxReturnChoiceSourceIndices = null;
                        return;
                    }
                    // Return to title and restart BGM
                    returnToTitle(resultEl, () => {
                        lineIndex = 0;
                        document.getElementById('bgm').currentTime = 0;
                        startBGM();
                    });
                });
            };
            const revealResultWithoutTransition = () => {
                const screen = document.getElementById('ooxx-screen');
                const resultEl = document.getElementById('ooxx-result');
                const textEl = document.getElementById('ooxx-result-text');
                const subEl = document.getElementById('ooxx-result-sub');
                if (textEl) {
                    textEl.textContent = resultText;
                    textEl.className = cls;
                }
                if (subEl) subEl.textContent = subText;
                if (screen) screen.classList.add('hidden');
                if (resultEl) {
                    resultEl.classList.remove('hidden');
                    resultEl.classList.remove('show-text');
                    void resultEl.offsetWidth;
                    resultEl.classList.add('show-text');
                }
                if (appState) {
                    try { appState.transition(GAME_STATES.RESULT, { source: 'ooxx_result_fallback' }); } catch (e) { }
                }
                bindResultClick(resultEl);
            };

            setTimeout(() => {
                const tryShowResult = async (attempt = 0) => {
                    const token = beginOOXXTransition('result');
                    if (!token) {
                        if (attempt >= OOXX_RESULT_LOCK_RETRY_MAX) {
                            console.warn('OOXX result transition lock timeout, using fallback reveal.');
                            ooxxTransitionLock = false;
                            revealResultWithoutTransition();
                            return;
                        }
                        setTimeout(() => { tryShowResult(attempt + 1); }, OOXX_RESULT_LOCK_RETRY_MS);
                        return;
                    }

                    try {
                        const screen = document.getElementById('ooxx-screen');

                        // Stop BGM
                        document.getElementById('bgm').pause();

                        // Keep OOXX lose SFX independent from the death-screen SFX.
                        if (!isDraw && !audioMuted) {
                            const ooxxLoseSfx = ctxRefs.ooxxLoseSfx || ctxRefs.deathSfx;
                            if (ooxxLoseSfx) {
                                ooxxLoseSfx.volume = parseFloat(document.getElementById('sfx-vol').value) / 100;
                                ooxxLoseSfx.currentTime = 0;
                                ooxxLoseSfx.play().catch(() => { });
                            }
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
                        bindResultClick(resultEl);
                    } catch (err) {
                        if (!err || err.message !== OOXX_TRANSITION_CANCELLED) {
                            console.error('OOXX result transition error:', err);
                        }
                    } finally {
                        endOOXXTransition(token, 'result');
                    }
                };

                tryShowResult(0);
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
            hasUsedMainOOXXChoice = true;
            resetBedFlow();
            ooxxReturnChoiceSourceIndices = (
                activeSceneId === SCENE_DEFAULT
                && !isRuntimeChoiceMode
                && Array.isArray(currentChoiceSourceIndices)
                && currentChoiceSourceIndices.length > 0
            )
                ? currentChoiceSourceIndices.slice()
                : null;
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

        function triggerDeath({ overrideText = '' } = {}) {
            resetBedFlow();
            resetHeadTouchChain('trigger_death');
            isFightSequenceActive = false;
            clearFightVisualFx();
            const deathScreen = document.getElementById('death-screen');
            const deathTextEl = document.getElementById('death-text');
            const defaultDeathText = l10n[currentLang]?.deathText || deathTextEl?.textContent || '';
            if (deathTextEl) {
                deathTextEl.textContent = overrideText || defaultDeathText;
            }
            if (appState && appState.getState() !== GAME_STATES.DEATH) {
                try { appState.transition(GAME_STATES.DEATH, { source: 'trigger_death' }); } catch (e) { }
            }
            deathScreen.classList.remove('hidden');

            // Stop BGM and play death sound
            audioService.stopBgm();
            audioService.playDeathSfx();

            // Show text after screen turns black
            setTimeout(() => {
                deathScreen.classList.add('show-text');

                // Return to title after keeping death screen for a few seconds
                setTimeout(() => {
                    deathScreen.classList.remove('show-text');
                    if (deathTextEl) deathTextEl.textContent = defaultDeathText;
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
            applyMoneyHeadState(true);
        }

        function hideMoneyPopup() {
            if (!moneyPopupEl) return;
            moneyPopupEl.classList.remove('visible');
            applyMoneyHeadState(false);
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
            isFightSequenceActive = false;
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
            isFightSequenceActive = false;
            showChoicePanel(FOLLOWUP_CHOICE_SOURCE_INDICES);
        }

        function showPetFox() {
            isDeathSequence = false;
            isFightSequenceActive = false;
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
            const targetEl = e.target instanceof Element ? e.target : null;
            if (isOpeningDialogueLocked) {
                return;
            }
            if (headTouchAwaitResumeClick && !isTyping) {
                if (targetEl && targetEl.closest('#head-touch-zone')) return;
                restoreHeadTouchSnapshot();
                e.stopPropagation();
                return;
            }
            if (headTouchInterruptActive) {
                return;
            }
            if (isMoneyIntermission) {
                if (skipMoneyResolveClick) {
                    skipMoneyResolveClick = false;
                    return;
                }
                resolveMoneyIntermission();
                return;
            }
            if (targetEl && targetEl.closest(NO_ADVANCE_SELECTORS)) return;
            if (pendingPostChoiceAction && !isTyping && !isMoneyIntermission) {
                const actionId = pendingPostChoiceAction;
                pendingPostChoiceAction = null;
                resetHeadTouchChain('post_choice_action');
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

            if (pendingClickAdvance && !isTyping && !inChoiceMode) {
                const continueFn = pendingClickAdvance;
                pendingClickAdvance = null;
                resetHeadTouchChain('scripted_continue');
                continueFn();
                return;
            }

            if (!isDeathSequence && !isTyping && !isOpeningPrologueActive) {
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
            if (!isDeathSequence && !isTyping && !inChoiceMode && script[lineIndex] && !isOpeningPrologueActive) {
                const t = l10n[lang];
                speakerPlate.textContent = t.speaker;
                dialogueText.textContent = t.lines[lineIndex];
                rememberCurrentLineText(t.lines[lineIndex]);
                applyAfraidHeadMode(isAfraidTargetLineText(t.lines[lineIndex]));
            } else if (inChoiceMode) {
                if (isRuntimeChoiceMode) {
                    renderRuntimeChoicePanel();
                    applyAfraidHeadMode(false);
                } else {
                    setChoiceButtons(currentChoiceSourceIndices);
                    applyAfraidHeadMode(shouldUseAfraidForChoice(currentChoiceSourceIndices));
                }
            }
        }

        function updateUIText() {
            const t = l10n[currentLang];
            if (!t || !t.ui) return;
            const ui = t.ui;

            document.getElementById('lang-ui-docTitle').textContent = ui.docTitle;
            document.querySelector('.lang-ui-gameTitle').textContent = getSceneGameTitle(ui);
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

        function syncFullscreenToggle() {
            setToggle('fs', document.fullscreenElement ? 'on' : 'off');
        }

        async function setFullscreenEnabled(enabled) {
            try {
                if (enabled) {
                    if (!document.fullscreenElement) {
                        await document.documentElement.requestFullscreen();
                    }
                } else if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
            } catch (err) {
                console.warn('Fullscreen toggle failed:', err);
            } finally {
                syncFullscreenToggle();
            }
        }

        document.addEventListener('fullscreenchange', syncFullscreenToggle);

        function bindUiActions() {
            bindOverlayController(document, {
                'open-settings': () => openSettings(),
                'close-settings': () => closeSettings(),
                'open-social': () => openSocial(),
                'toggle-audio': () => toggleAudioGlobal(),
                'open-history': () => openHistory(),
                'open-map': () => openMap(),
                'prev-line': () => prevLine(),
                'start-game': () => startGame(),
                'set-language': ({ actionEl }) => setLanguage(actionEl.dataset.lang),
                'head-touch': ({ event }) => handleHeadTouchAction(event),
                'set-toggle': ({ actionEl }) => setToggle(actionEl.dataset.toggleGroup, actionEl.dataset.toggleValue),
                'set-fullscreen': ({ actionEl }) => setFullscreenEnabled(actionEl.dataset.fullscreen === 'on'),
                'update-slider': ({ actionEl }) => updateSlider(actionEl),
                'overlay-settings-dismiss': ({ event }) => handleSettingsClick(event),
                'overlay-map-dismiss': () => closeMap(),
                'close-map': ({ event }) => closeMap(event),
                'overlay-history-dismiss': ({ event }) => handleHistoryClick(event),
                'close-history': () => closeHistory(),
                'pick-choice': ({ actionEl }) => {
                    if (isOpeningDialogueLocked) return;
                    if (!inChoiceMode || !choicePanel.classList.contains('visible')) return;
                    const slotIndex = Number.parseInt(actionEl.dataset.choiceIndex || '-1', 10);
                    if (Number.isNaN(slotIndex) || slotIndex < 0) return;
                    if (isRuntimeChoiceMode) {
                        handleRuntimeChoice(slotIndex);
                        return;
                    }
                    const sourceIndex = currentChoiceSourceIndices[slotIndex];
                    if (typeof sourceIndex === 'number') {
                        pickChoice(sourceIndex);
                    }
                }
            });
        }

        const charImageEls = Array.from(document.querySelectorAll('.char-img'));
        const gyroSystem = createGyroParallaxSystem({
            charImages: charImageEls,
            bgEl,
            bgSplashEl,
            moneyPopupEl,
            getSceneId: () => activeSceneId,
            sceneFightId: SCENE_FIGHT,
            getMoneyFocusActive: () => mobileMoneyFocusActive,
            getCharFocusX: () => getComputedStyle(document.documentElement).getPropertyValue('--char-focus-x').trim() || '50%',
            getCharFocusY: () => getComputedStyle(document.documentElement).getPropertyValue('--char-focus-y').trim() || '22%',
            getFightObjectPosition: () => FIGHT_SCENE_OBJECT_POSITION,
            moneyFocusXPct: MONEY_FOCUS_X_PCT,
            moneyFocusYPct: MONEY_FOCUS_Y_PCT,
            mobileMoneyCharacterShiftPx: MOBILE_MONEY_CHARACTER_SHIFT_PX,
            mobileMoneyPopupShiftPx: MOBILE_MONEY_POPUP_SHIFT_PX,
            applyFightTailPivot: applyFightTailPivotFromSource
        });
        gyroSystem.start();

        const assetPreloader = createAssetPreloader({
            assets: PRELOAD_IMAGE_ASSETS,
            loadingFillEl: document.getElementById('loading-bar-fill'),
            loadingTextEl: document.getElementById('loading-text'),
            loadingContainerEl: document.getElementById('loading-container'),
            startBtnEl: document.getElementById('start-btn')
        });

        let areImageAssetsReady = false;
        let failedImageAssets = [];

        async function startAssetLoader() {
            const result = await assetPreloader.start();
            areImageAssetsReady = result.ok;
            failedImageAssets = result.failedAssets;
            if (!result.ok) {
                console.error('[ASSET] Failed image preloads:', failedImageAssets);
            }
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
            if (!areImageAssetsReady) {
                const loadingText = document.getElementById('loading-text');
                if (failedImageAssets.length > 0) {
                    loadingText.textContent = `Failed to load ${failedImageAssets.length} image(s). Please refresh.`;
                } else {
                    loadingText.textContent = 'Loading Assets... Please wait.';
                }
                document.getElementById('loading-container').style.display = 'flex';
                document.getElementById('start-btn').style.display = 'none';
                return;
            }
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
            rememberCurrentLineText('');
            hasUsedMainOOXXChoice = false;
            isTyping = false;
            inChoiceMode = false;
            isDeathSequence = false;
            isAngry = false;
            isHappy = false;
            isAfraidHeadMode = false;
            isShyBedTransitionMode = false;
            isOpeningPrologueActive = false;
            isHappyTalkMode = false;
            isFightSequenceActive = false;
            isOpeningDialogueLocked = true;
            isOpeningGreetingHeadTouchLocked = false;
            pendingPostChoiceAction = null;
            pendingClickAdvance = null;
            currentChoiceSourceIndices = [...DEFAULT_CHOICE_SOURCE_INDICES];
            resetBedFlow();
            resetHeadTouchChain('start_game');
            ooxxReturnChoiceSourceIndices = null;
            dialogueHistory.length = 0;
            clearFightVisualFx();

            // Reset UI elements that may be dirty
            dialogueController.setChoiceMode(false);
            choiceController.hide();
            dialogueController.renderText('');
            syncMobileChoiceUi();

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
            applyOpeningHeadMode(true);
            applyScene(SCENE_DEFAULT);
            setChoiceButtons(DEFAULT_CHOICE_SOURCE_INDICES);

            // Fade out assets/images/scenes/default/bg-main.jpg splash as character fades in
            const splash = document.getElementById('bg-splash');
            if (splash) splash.classList.add('fade-out');

            clearTimeout(blinkTimeout);
            stopSpeakingAnimation();
            setCharState('idle');
            scheduleNextBlink();
            if (appState && appState.getState() !== GAME_STATES.DIALOGUE) {
                try { appState.transition(GAME_STATES.DIALOGUE, { source: 'start_game' }); } catch (e) { }
            }
            // Wait for assets/images/scenes/default/bg-main.jpg to finish fading (1.4s) before starting dialogue
            setTimeout(startOpeningPrologue, 1400);
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
            rememberCurrentLineText('');
            hasUsedMainOOXXChoice = false;
            isAfraidHeadMode = false;
            isShyBedTransitionMode = false;
            isOpeningPrologueActive = false;
            isHappyTalkMode = false;
            isFightSequenceActive = false;
            isOpeningDialogueLocked = false;
            isOpeningGreetingHeadTouchLocked = false;
            pendingPostChoiceAction = null;
            pendingClickAdvance = null;
            currentChoiceSourceIndices = [...DEFAULT_CHOICE_SOURCE_INDICES];
            resetBedFlow();
            resetHeadTouchChain('return_to_title');
            ooxxReturnChoiceSourceIndices = null;
            hideChoicePanel();
            setCharState('idle'); // revert character to idle
            dialogueText.textContent = ''; // clear text
            clearFightVisualFx();
            resetMoneyIntermission();
            if (toBeContinuedEl) toBeContinuedEl.classList.add('hidden');
            if (petFoxTimer) {
                clearTimeout(petFoxTimer);
                petFoxTimer = null;
            }
            if (petFoxScreenEl) petFoxScreenEl.classList.add('hidden');
            applyScene(SCENE_DEFAULT);
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

        window.addEventListener('resize', () => {
            if (activeSceneId === SCENE_FIGHT) {
                applyFightTailPivotFromSource();
            }
        });

        // Start
        scheduleNextBlink();
        // Do not renderLine(0) immediately, wait for Start
        // renderLine(0);


