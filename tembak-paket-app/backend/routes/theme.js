/**
 * Dynamic Theme Engine Routes
 * Public endpoints for active theme & presets
 * Protected endpoints for admin theme management
 */

const express = require('express');
const router = express.Router();
const ThemeEngineService = require('../services/themeEngineService');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// 1. GET /api/theme/active (Public - used by SSR / Client App)
router.get('/active', async (req, res) => {
    try {
        const theme = await ThemeEngineService.getActiveTheme();
        res.json({
            success: true,
            data: theme
        });
    } catch (err) {
        console.error('Error fetching active theme:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil konfigurasi tema aktif'
        });
    }
});

// 2. GET /api/theme/all (Public / Preview)
router.get('/all', async (req, res) => {
    try {
        const themes = await ThemeEngineService.getAllThemes();
        res.json({
            success: true,
            data: themes
        });
    } catch (err) {
        console.error('Error fetching all themes:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar tema'
        });
    }
});

// 3. GET /api/theme/admin/overview (Admin Only)
router.get('/admin/overview', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const overview = await ThemeEngineService.getAdminOverview();
        res.json({
            success: true,
            data: overview
        });
    } catch (err) {
        console.error('Error fetching admin theme overview:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat panel tema admin'
        });
    }
});

// 4. PUT /api/theme/admin/settings (Admin Only - One-Click Apply & Toggle Auto-Schedule)
router.put('/admin/settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { autoScheduleEnabled, manualOverrideThemeId } = req.body;
        const updated = await ThemeEngineService.updateSettings({
            autoScheduleEnabled: Boolean(autoScheduleEnabled),
            manualOverrideThemeId: manualOverrideThemeId || null,
            updatedBy: req.session?.user?.name || 'admin'
        });

        res.json({
            success: true,
            message: 'Pengaturan tema berhasil disimpan',
            data: updated
        });
    } catch (err) {
        console.error('Error updating theme settings:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan pengaturan tema'
        });
    }
});

// 5. PUT /api/theme/admin/schedule/:id (Admin Only - Update Buffer H-X / H+X)
router.put('/admin/schedule/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const scheduleId = parseInt(req.params.id, 10);
        const { bufferDaysBefore, bufferDaysAfter, isEnabled, priorityScore } = req.body;

        const updatedSchedule = await ThemeEngineService.updateSchedule(scheduleId, {
            bufferDaysBefore: bufferDaysBefore !== undefined ? parseInt(bufferDaysBefore, 10) : undefined,
            bufferDaysAfter: bufferDaysAfter !== undefined ? parseInt(bufferDaysAfter, 10) : undefined,
            isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : undefined,
            priorityScore: priorityScore !== undefined ? parseInt(priorityScore, 10) : undefined
        });

        res.json({
            success: true,
            message: 'Jadwal momentum tema berhasil diperbarui',
            data: updatedSchedule
        });
    } catch (err) {
        console.error('Error updating theme schedule:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui jadwal tema'
        });
    }
});

module.exports = router;
