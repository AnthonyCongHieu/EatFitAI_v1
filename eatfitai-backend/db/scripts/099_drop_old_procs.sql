SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Xoa cac thu tuc cu (ten tieng Anh) neu ton tai
IF OBJECT_ID('dbo.sp_Profile_Get', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_Profile_Get];
GO
IF OBJECT_ID('dbo.sp_Profile_Update', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_Profile_Update];
GO
IF OBJECT_ID('dbo.sp_BodyMetrics_Add', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_BodyMetrics_Add];
GO
IF OBJECT_ID('dbo.sp_NutritionTargets_GetCurrent', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_NutritionTargets_GetCurrent];
GO
IF OBJECT_ID('dbo.sp_NutritionTargets_Upsert', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_NutritionTargets_Upsert];
GO
IF OBJECT_ID('dbo.sp_Foods_Search', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_Foods_Search];
GO
IF OBJECT_ID('dbo.sp_Foods_GetById', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_Foods_GetById];
GO
IF OBJECT_ID('dbo.sp_CustomDish_Create', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CustomDish_Create];
GO
IF OBJECT_ID('dbo.sp_CustomDish_Get', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CustomDish_Get];
GO
IF OBJECT_ID('dbo.sp_CustomDish_GetById', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_CustomDish_GetById];
GO
IF OBJECT_ID('dbo.sp_Diary_Create', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_Diary_Create];
GO
IF OBJECT_ID('dbo.sp_Diary_GetByDate', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_Diary_GetByDate];
GO
IF OBJECT_ID('dbo.sp_Diary_Delete', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_Diary_Delete];
GO
IF OBJECT_ID('dbo.sp_Summary_Day', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_Summary_Day];
GO
IF OBJECT_ID('dbo.sp_Summary_Week', 'P') IS NOT NULL DROP PROCEDURE [dbo].[sp_Summary_Week];
GO

