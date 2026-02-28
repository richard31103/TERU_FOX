import { bindDialogueUI } from '../ui/dialogue_ui.js';
import { createAudioService } from '../services/audio.js';

export function createAppContext(root = document) {
    const refs = {
        bgm: root.getElementById('bgm'),
        deathSfx: root.getElementById('sfx-death'),
        sfxPunch: root.getElementById('sfx-punch'),
        ooxxLoseSfx: root.getElementById('sfx-ooxx-lose'),
        sfxVolume: root.getElementById('sfx-vol'),
        gameContainer: root.getElementById('game-container'),
        characterContainer: root.getElementById('character-container'),
        bg: root.getElementById('bg'),
        bgSplash: root.getElementById('bg-splash'),
        charTail: root.getElementById('char-tail'),
        charBody: root.getElementById('char-body'),
        charIdle: root.getElementById('char-head-idle'),
        charBlink: root.getElementById('char-head-blink'),
        charSpeak: root.getElementById('char-head-speak'),
        charAngry: root.getElementById('char-head-angry'),
        charHappy: root.getElementById('char-head-happy'),
        charHappyTalk: root.getElementById('char-head-happy-talk'),
        moneyPopup: root.getElementById('money-popup'),
        fightDamageNumber: root.getElementById('fight-damage-number'),
        fightRedFlash: root.getElementById('fight-red-flash'),
        titleScreen: root.getElementById('title-screen'),
        ooxxCurtain: root.getElementById('ooxx-curtain'),
        toBeContinuedScreen: root.getElementById('to-be-continued-screen'),
        petFoxScreen: root.getElementById('pet-fox-screen')
    };

    const dialogueUI = bindDialogueUI(root);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audio = createAudioService({
        audioCtx,
        bgmEl: refs.bgm,
        deathSfxEl: refs.deathSfx,
        sfxVolumeEl: refs.sfxVolume
    });

    return {
        refs,
        dialogueUI,
        audio,
        audioCtx
    };
}
