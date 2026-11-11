import React from "react";
import { useBackend } from "main/utils/useBackend";

import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import PersonalSchedulesTable from "main/components/PersonalSchedules/PersonalSchedulesTable";
import { useCurrentUser } from "main/utils/currentUser";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function PersonalSchedulesIndexPage() {
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();

  const {
    data: personalSchedules,
    error: _error,
    status: _status,
  } = useBackend(
    // Stryker disable next-line all : don't test internal caching of React Query
    ["/api/personalschedules/all"],
    { method: "GET", url: "/api/personalschedules/all" },
    [],
  );
  const createButton = () => {
    return (
      <Button
        variant="primary"
        onClick={() => navigate("/personalschedules/create")}
        style={{}}
      >
        Add New Personal Schedule
      </Button>
    );
  };
  return (
    <BasicLayout>
      <div className="pt-2">
        <h1>Personal Schedules</h1>
        <PersonalSchedulesTable
          personalSchedules={personalSchedules}
          currentUser={currentUser}
        />
        {createButton()}
      </div>
    </BasicLayout>
  );
}
