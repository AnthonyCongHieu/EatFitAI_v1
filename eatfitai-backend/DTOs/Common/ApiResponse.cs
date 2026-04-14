using System.Collections.Generic;

namespace EatFitAI.API.DTOs.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
    public string? ErrorCode { get; set; }
    public string? RequestId { get; set; }
    public string? Severity { get; set; }
    public string? AuditRef { get; set; }
    public List<string>? Warnings { get; set; }

    public static ApiResponse<T> SuccessResponse(
        T data,
        string? message = null,
        string? requestId = null,
        string? severity = null,
        string? auditRef = null,
        List<string>? warnings = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data,
            RequestId = requestId,
            Severity = severity,
            AuditRef = auditRef,
            Warnings = warnings
        };
    }

    public static ApiResponse<T> ErrorResponse(
        string message,
        string? errorCode = null,
        string? requestId = null,
        string? severity = null,
        string? auditRef = null,
        List<string>? warnings = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            ErrorCode = errorCode,
            RequestId = requestId,
            Severity = severity,
            AuditRef = auditRef,
            Warnings = warnings
        };
    }
}
