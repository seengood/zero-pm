export const LINK_TYPES = {
    FINISH_TO_START: 'e2s',
    START_TO_START: 's2s',
    FINISH_TO_FINISH: 'e2e',
    START_TO_FINISH: 's2e'
} as const;

export const LINK_TYPE_LABELS = {
    [LINK_TYPES.FINISH_TO_START]: 'FS (Finish-to-Start)',
    [LINK_TYPES.START_TO_START]: 'SS (Start-to-Start)',
    [LINK_TYPES.FINISH_TO_FINISH]: 'FF (Finish-to-Finish)',
    [LINK_TYPES.START_TO_FINISH]: 'SF (Start-to-Finish)'
};

export const CONSTRAINT_TYPES = {
    ASAP: 'asap',
    ALAP: 'alap',
    MSO: 'mso',
    MFO: 'mfo',
    SNET: 'snet',
    FNLT: 'fnlt'
} as const;

export const CONSTRAINT_LABELS = {
    asap: 'As Soon As Possible',
    alap: 'As Late As Possible',
    mso: 'Must Start On',
    mfo: 'Must Finish On',
    snet: 'Start No Earlier Than',
    fnlt: 'Finish No Later Than'
} as const;
