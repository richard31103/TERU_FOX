export function createBedFlowState() {
    return {
        active: false,
        phase: 'none',
        tailOptionRemoved: false,
        continueTouchCount: 0,
        tearsAfterStop: false
    };
}
