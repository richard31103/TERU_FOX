export function createBedFlowState() {
    return {
        active: false,
        phase: 'none',
        tailOptionRemoved: false,
        continueTouchCount: 0,
        postCryContinueCount: 0,
        extraMoneyUnlocked: false,
        tearsAfterStop: false
    };
}
