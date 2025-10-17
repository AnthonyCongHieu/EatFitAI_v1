using Serilog;

// Khởi tạo Serilog sớm để log trong quá trình bootstrap
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// Gắn Serilog vào host (đọc cấu hình nếu có) - vì cần log tập trung
builder.Host.UseSerilog((ctx, lc) =>
    lc.ReadFrom.Configuration(ctx.Configuration)
      .WriteTo.Console());

// Health checks - để kiểm tra sống/chết đơn giản
builder.Services.AddHealthChecks();

// CORS: cho phép app Expo (exp://*) và local web (localhost:19006)
const string CorsPolicyName = "Default";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (string.Equals(origin, "http://localhost:19006", StringComparison.OrdinalIgnoreCase))
                    return true;
                if (origin.StartsWith("exp://", StringComparison.OrdinalIgnoreCase))
                    return true; // Cho expo dev client
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// OpenAPI (mặc định 3.x) để mô tả API rõ ràng
builder.Services.AddOpenApi();

var app = builder.Build();

// Bật CORS sớm cho tất cả route
app.UseCors(CorsPolicyName);

// Serilog request logging - theo dõi request/response cơ bản
app.UseSerilogRequestLogging();

// Xuất JSON OpenAPI tại /openapi/v1.json
app.MapOpenApi();

// Swagger UI tại /swagger, trỏ tới JSON ở trên
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/openapi/v1.json", "EatFitAI API v1");
    c.RoutePrefix = "swagger";
});

// Health endpoint
app.MapHealthChecks("/health");

// Endpoint mẫu để kiểm tra nhanh
app.MapGet("/", () => Results.Ok(new { name = "EatFitAI Backend", status = "ok" }));
app.MapGet("/ping", () => Results.Ok(new { message = "pong" }));

app.Run();
