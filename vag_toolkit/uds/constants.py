"""UDS (ISO 14229) service IDs and common NRC codes."""

# Service IDs
SID_DIAGNOSTIC_SESSION_CONTROL     = 0x10
SID_ECU_RESET                       = 0x11
SID_SECURITY_ACCESS                 = 0x27
SID_COMMUNICATION_CONTROL          = 0x28
SID_READ_DATA_BY_ID                 = 0x22
SID_WRITE_DATA_BY_ID                = 0x2E
SID_IO_CONTROL                      = 0x2F
SID_ROUTINE_CONTROL                 = 0x31
SID_READ_MEMORY_BY_ADDRESS          = 0x23
SID_DYNAMICALLY_DEFINE_DATA_ID      = 0x2C
SID_READ_DTC                        = 0x19
SID_CLEAR_DTC                       = 0x14
SID_TESTER_PRESENT                  = 0x3E

# Diagnostic session types
SESSION_DEFAULT     = 0x01
SESSION_PROGRAMMING = 0x02
SESSION_EXTENDED    = 0x03
SESSION_CODING      = 0x60  # VAG-specific

# Security access sub-functions
SA_REQUEST_SEED_LEVEL_01 = 0x01
SA_SEND_KEY_LEVEL_01     = 0x02
SA_REQUEST_SEED_LEVEL_03 = 0x03
SA_SEND_KEY_LEVEL_03     = 0x04
SA_REQUEST_SEED_LEVEL_11 = 0x11
SA_SEND_KEY_LEVEL_11     = 0x12

# Negative Response Codes
NRC = {
    0x10: "generalReject",
    0x11: "serviceNotSupported",
    0x12: "subFunctionNotSupported",
    0x13: "incorrectMessageLengthOrInvalidFormat",
    0x14: "responseTooLong",
    0x21: "busyRepeatRequest",
    0x22: "conditionsNotCorrect",
    0x24: "requestSequenceError",
    0x25: "noResponseFromSubnetComponent",
    0x26: "failurePreventsExecutionOfRequestedAction",
    0x31: "requestOutOfRange",
    0x33: "securityAccessDenied",
    0x35: "invalidKey",
    0x36: "exceededNumberOfAttempts",
    0x37: "requiredTimeDelayNotExpired",
    0x70: "uploadDownloadNotAccepted",
    0x71: "transferDataSuspended",
    0x72: "generalProgrammingFailure",
    0x73: "wrongBlockSequenceCounter",
    0x78: "requestCorrectlyReceivedResponsePending",
    0x7E: "subFunctionNotSupportedInActiveSession",
    0x7F: "serviceNotSupportedInActiveSession",
}

# VAG CAN addresses for common modules
VAG_MODULE_CAN = {
    "01": 0x7E0,   # Engine
    "02": 0x7E1,   # Transmission
    "03": 0x7E2,   # ABS/ESP
    "08": 0x7E7,   # Auto HVAC
    "09": 0x7E8,   # Central electrics
    "19": 0x7D0,   # CAN gateway
    "44": 0x7C6,   # Steering assist
    "5F": 0x7C0,   # Information electronics (MIB3)
    "A5": 0x7B0,   # Front sensors ADAS
}
