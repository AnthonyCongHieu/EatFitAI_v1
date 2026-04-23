namespace EatFitAI.API.Exceptions
{
    public sealed class BarcodeProviderUnavailableException : Exception
    {
        public BarcodeProviderUnavailableException(string message)
            : base(message)
        {
        }

        public BarcodeProviderUnavailableException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}
