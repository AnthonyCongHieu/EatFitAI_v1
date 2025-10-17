FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Sao chép csproj để khôi phục trước (tối ưu layer build)
COPY ["src/EatFitAI.Api/EatFitAI.Api.csproj", "src/EatFitAI.Api/"]
COPY ["src/EatFitAI.Application/EatFitAI.Application.csproj", "src/EatFitAI.Application/"]
COPY ["src/EatFitAI.Domain/EatFitAI.Domain.csproj", "src/EatFitAI.Domain/"]
COPY ["src/EatFitAI.Infrastructure/EatFitAI.Infrastructure.csproj", "src/EatFitAI.Infrastructure/"]
COPY ["Directory.Build.props", "."]
RUN dotnet restore "src/EatFitAI.Api/EatFitAI.Api.csproj"

# Sao chép toàn bộ và publish
COPY . .
WORKDIR "/src/src/EatFitAI.Api"
RUN dotnet publish "EatFitAI.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "EatFitAI.Api.dll"]

