/**
 * Design System Constants
 * Đảm bảo đồng bộ UI/UX toàn bộ app
 * Tiêu chí: Nhanh - Gọn - Đơn giản - Hiện đại - Đẹp - Xu hướng - Thông minh
 */

// BUTTON SIZES - Đảm bảo touch target tối thiểu 44x44
export const BUTTON_SIZES = {
    small: {
        height: 36,
        paddingHorizontal: 12,
        fontSize: 14,
        iconSize: 16,
    },
    medium: {
        height: 44, // iOS minimum touch target
        paddingHorizontal: 16,
        fontSize: 16,
        iconSize: 20,
    },
    large: {
        height: 52, // Primary actions
        paddingHorizontal: 20,
        fontSize: 18,
        iconSize: 24,
    },
} as const;

// TOUCH TARGETS - Accessibility standards
export const TOUCH_TARGET = {
    minimum: 44, // iOS/Android minimum
    comfortable: 48, // Recommended
    large: 56, // Important actions
} as const;

// CARD SPACING - Consistent padding
export const CARD_PADDING = {
    mini: 8,
    small: 12,
    medium: 16, // Standard
    large: 20,
} as const;

// BOTTOM SHEET HEIGHTS - Predefined heights
export const SHEET_HEIGHTS = {
    small: 300, // Simple forms
    medium: 480, // Most cases
    large: 580, // Content-heavy (Voice AI)
    xlarge: 700, // Maximum before full screen
} as const;

// SPACING BETWEEN SECTIONS
export const SECTION_SPACING = {
    tight: 8, // Within group
    normal: 12, // Between cards
    comfortable: 16, // Between sections
    loose: 24, // Between major sections
} as const;

// ANIMATION DURATIONS - Consistent timing
export const ANIMATION_DURATION = {
    instant: 0,
    fast: 150, // Quick feedback
    normal: 250, // Default
    slow: 400, // Smooth transitions
} as const;

// Z-INDEX LAYERS - Prevent overlap issues
export const Z_INDEX = {
    base: 0,
    dropdown: 10,
    sticky: 20,
    modal: 30,
    popover: 40,
    toast: 50,
} as const;

// CONTENT WIDTH - Responsive constraints
export const CONTENT_WIDTH = {
    max: 600, // Maximum content width for readability
    card: '100%',
} as const;

// COMMON PATTERNS
export const PATTERNS = {
    // Card với shadow nhẹ
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    // Border nhẹ cho separation
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    // Flex row center
    flexCenter: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    // Flex row space-between
    flexBetween: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
    },
} as const;

// STATUS ICONS - Consistent emoji usage
export const STATUS_ICONS = {
    recording: '🎤',
    processing: '✍️',
    thinking: '🤖',
    executing: '⚡',
    success: '✅',
    error: '❌',
    info: '💬',
    food: '🍽️',
    weight: '⚖️',
    fire: '🔥',
    stats: '📊',
} as const;

export default {
    BUTTON_SIZES,
    TOUCH_TARGET,
    CARD_PADDING,
    SHEET_HEIGHTS,
    SECTION_SPACING,
    ANIMATION_DURATION,
    Z_INDEX,
    CONTENT_WIDTH,
    PATTERNS,
    STATUS_ICONS,
};
