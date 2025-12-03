namespace EatFitAI.API.DTOs.Common
{
    /// <summary>
    /// Base class for paginated requests
    /// </summary>
    public class PagedRequest
    {
        private int _page = 1;
        private int _pageSize = 20;

        /// <summary>
        /// Page number (1-based)
        /// </summary>
        public int Page
        {
            get => _page;
            set => _page = value < 1 ? 1 : value;
        }

        /// <summary>
        /// Number of items per page (max 100)
        /// </summary>
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value switch
            {
                < 1 => 20,
                > 100 => 100,
                _ => value
            };
        }

        /// <summary>
        /// Sort field name
        /// </summary>
        public string? SortBy { get; set; }

        /// <summary>
        /// Sort order: "asc" or "desc" (default: "desc")
        /// </summary>
        public string SortOrder { get; set; } = "desc";

        /// <summary>
        /// Calculate skip count for database query
        /// </summary>
        public int Skip => (Page - 1) * PageSize;

        /// <summary>
        /// Get take count for database query
        /// </summary>
        public int Take => PageSize;
    }

    /// <summary>
    /// Generic paginated response wrapper
    /// </summary>
    /// <typeparam name="T">Type of data items</typeparam>
    public class PagedResponse<T>
    {
        /// <summary>
        /// List of data items for current page
        /// </summary>
        public List<T> Data { get; set; } = new();

        /// <summary>
        /// Current page number
        /// </summary>
        public int Page { get; set; }

        /// <summary>
        /// Number of items per page
        /// </summary>
        public int PageSize { get; set; }

        /// <summary>
        /// Total number of items across all pages
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Total number of pages
        /// </summary>
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);

        /// <summary>
        /// Whether there is a previous page
        /// </summary>
        public bool HasPrevious => Page > 1;

        /// <summary>
        /// Whether there is a next page
        /// </summary>
        public bool HasNext => Page < TotalPages;

        /// <summary>
        /// Create paginated response from query result
        /// </summary>
        public static PagedResponse<T> Create(List<T> data, int page, int pageSize, int totalCount)
        {
            return new PagedResponse<T>
            {
                Data = data,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            };
        }
    }
}
