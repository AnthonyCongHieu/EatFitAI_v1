namespace EatFitAI.API.Models;

public class OpsMetricBucket
{
    public Guid OpsMetricBucketId { get; set; }
    public string Source { get; set; } = "api";
    public string Method { get; set; } = "GET";
    public string RouteGroup { get; set; } = "other";
    public string StatusClass { get; set; } = "2xx";
    public DateTime BucketStart { get; set; }
    public string Granularity { get; set; } = "minute";
    public long RequestCount { get; set; }
    public long ErrorCount { get; set; }
    public long DurationSumMs { get; set; }
    public int DurationMaxMs { get; set; }
    public string LatencyHistogramJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
