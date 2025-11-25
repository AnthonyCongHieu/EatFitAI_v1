using System;
using System.Collections.Generic;

namespace EatFitAI.API.DTOs.AI
{
    /// <summary>
    /// Enhanced vision detection result with caching support
    /// </summary>
    public class EnhancedVisionDetectResultDto
    {
        /// <summary>
        /// Detected and mapped food items
        /// </summary>
        public List<MappedFoodDto> Items { get; set; } = new();

        /// <summary>
        /// Labels that couldn't be mapped to food items
        /// </summary>
        public List<UnmappedLabelDto> UnmappedLabels { get; set; } = new();

        /// <summary>
        /// Whether result was served from cache
        /// </summary>
        public bool FromCache { get; set; }

        /// <summary>
        /// Detection confidence score (0-100)
        /// </summary>
        public decimal OverallConfidence { get; set; }

        /// <summary>
        /// Number of items detected
        /// </summary>
        public int TotalDetections { get; set; }

        /// <summary>
        /// Processing time in milliseconds
        /// </summary>
        public long ProcessingTimeMs { get; set; }
    }

    /// <summary>
    /// Unmapped label with teaching suggestions
    /// </summary>
    public class UnmappedLabelDto
    {
        /// <summary>
        /// Detected label
        /// </summary>
        public string Label { get; set; } = default!;

        /// <summary>
        /// Detection confidence (0-1)
        /// </summary>
        public double Confidence { get; set; }

        /// <summary>
        /// Suggested food items for mapping
        /// </summary>
        public List<FoodItemSuggestionDto> Suggestions { get; set; } = new();

        /// <summary>
        /// Whether this label has been seen before
        /// </summary>
        public bool PreviouslyDetected { get; set; }

        /// <summary>
        /// Number of times this label was detected
        /// </summary>
        public int DetectionCount { get; set; }
    }

    /// <summary>
    /// Food item suggestion for teaching
    /// </summary>
    public class FoodItemSuggestionDto
    {
        public int FoodItemId { get; set; }
        public string FoodName { get; set; } = default!;
        public decimal MatchScore { get; set; }
        public string Reasoning { get; set; } = default!;
    }

    /// <summary>
    /// Request for batch vision detection
    /// </summary>
    public class BatchVisionDetectRequest
    {
        /// <summary>
        /// Base64 encoded images
        /// </summary>
        public List<string> Images { get; set; } = new();

        /// <summary>
        /// Use cached results if available
        /// </summary>
        public bool UseCache { get; set; } = true;

        /// <summary>
        /// Maximum images to process (default: 5)
        /// </summary>
        public int MaxImages { get; set; } = 5;
    }

    /// <summary>
    /// Batch detection result
    /// </summary>
    public class BatchVisionDetectResultDto
    {
        /// <summary>
        /// Results for each image
        /// </summary>
        public List<ImageDetectionResultDto> Results { get; set; } = new();

        /// <summary>
        /// Total processing time
        /// </summary>
        public long TotalProcessingTimeMs { get; set; }

        /// <summary>
        /// Number of results from cache
        /// </summary>
        public int CachedResults { get; set; }
    }

    /// <summary>
    /// Single image detection result
    /// </summary>
    public class ImageDetectionResultDto
    {
        /// <summary>
        /// Image index in batch
        /// </summary>
        public int ImageIndex { get; set; }

        /// <summary>
        /// Detection result
        /// </summary>
        public EnhancedVisionDetectResultDto Result { get; set; } = default!;

        /// <summary>
        /// Error message if detection failed
        /// </summary>
        public string? Error { get; set; }
    }

    /// <summary>
    /// Detection history entry
    /// </summary>
    public class DetectionHistoryDto
    {
        public int DetectionId { get; set; }
        public DateTime DetectedAt { get; set; }
        public List<string> DetectedLabels { get; set; } = new();
        public List<string> MappedFoodNames { get; set; } = new();
        public int UnmappedCount { get; set; }
        public decimal AverageConfidence { get; set; }
    }

    /// <summary>
    /// Request for detection history
    /// </summary>
    public class DetectionHistoryRequest
    {
        /// <summary>
        /// Number of days to retrieve (default: 30)
        /// </summary>
        public int Days { get; set; } = 30;

        /// <summary>
        /// Maximum results to return
        /// </summary>
        public int MaxResults { get; set; } = 50;

        /// <summary>
        /// Include only detections with unmapped labels
        /// </summary>
        public bool OnlyUnmapped { get; set; } = false;
    }

    /// <summary>
    /// Teach label request with enhanced validation
    /// </summary>
    public class EnhancedTeachLabelRequest
    {
        /// <summary>
        /// Label to teach
        /// </summary>
        public string Label { get; set; } = default!;

        /// <summary>
        /// Food item ID to map to
        /// </summary>
        public int FoodItemId { get; set; }

        /// <summary>
        /// Minimum confidence threshold (0-1)
        /// </summary>
        public decimal? MinConfidence { get; set; }

        /// <summary>
        /// Apply to similar labels automatically
        /// </summary>
        public bool ApplyToSimilar { get; set; } = false;

        /// <summary>
        /// User notes for this mapping
        /// </summary>
        public string? Notes { get; set; }
    }
}
