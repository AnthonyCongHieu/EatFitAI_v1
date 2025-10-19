using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DiagnosticsController : ControllerBase
{
    // Endpoint don gian de kiem tra trang thai API
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok(new { message = "EatFitAI API hoat dong" });
    }
}
