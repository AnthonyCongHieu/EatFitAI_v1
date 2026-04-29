# Dockerfile cho EatFitAI Backend API (.NET 9)
# Multi-stage build để giảm kích thước image

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS base
WORKDIR /app
# Render.com mặc định dùng port 10000
EXPOSE 10000

FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

# Copy csproj riêng để tận dụng Docker layer cache
COPY ["EatFitAI.API.csproj", "."]
COPY ["Directory.Build.props", "."]
RUN dotnet restore

# Copy toàn bộ source code rồi build
COPY . .
RUN dotnet publish EatFitAI.API.csproj -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .

# Cấu hình cho production trên Render
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:10000
ENV DOTNET_hostBuilder__reloadConfigOnChange=false
ENV DOTNET_RUNNING_IN_CONTAINER=true

# Memory optimization cho Render Free Plan (512MB RAM)
# Tắt Server GC → dùng Workstation GC (ít RAM hơn, phù hợp single-core)
ENV DOTNET_GCServer=0
# Giới hạn GC heap = 200MB (hex), để dành RAM cho OS + Docker runtime
ENV DOTNET_GCHeapHardLimit=0xC800000
# Bật container-aware GC (tự động detect memory limit từ cgroup)
ENV DOTNET_GCConserveMemory=9

ENTRYPOINT ["dotnet", "EatFitAI.API.dll"]
