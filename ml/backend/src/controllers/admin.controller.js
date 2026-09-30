const getAdminDashboard = async (req, res, next) => {
  try {
    res.status(200).json({
      message: 'Admin dashboard metrics retrieved successfully',
      stats: {
        totalUsers: 42,
        activePatients: 30,
        doctorsOnDuty: 8,
        systemHealth: 'Optimal'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAdminDashboard };
