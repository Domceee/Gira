"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./retrospective.module.css";

interface RetroData {
  start_doing: string[];
  stop_doing: string[];
  continue_doing: string[];
}

export default function RetrospectivePage() {
  const params = useParams();
  const sprintId = params.sprintId as string;

  const [retroData, setRetroData] = useState<RetroData>({
    start_doing: [],
    stop_doing: [],
    continue_doing: [],
  });
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch retrospective data
  const fetchRetroData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(
        `/api/sprints/${sprintId}/retrospective`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.retrospective_data) {
          setRetroData(data.retrospective_data);
        }
        setIsFinished(data.is_finished || false);
      } else {
        setError("Failed to load retrospective");
      }
    } catch (err) {
      setError("Error loading retrospective");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchRetroData();
  }, [fetchRetroData]);

  // Handle text change for individual items
  const updateItem = (
    column: keyof RetroData,
    index: number,
    value: string
  ) => {
    setRetroData((prev) => ({
      ...prev,
      [column]: prev[column].map((item, i) => (i === index ? value : item)),
    }));
  };

  // Add new item to column
  const addItem = (column: keyof RetroData) => {
    setRetroData((prev) => ({
      ...prev,
      [column]: [...prev[column], ""],
    }));
  };

  // Remove item from column
  const removeItem = (column: keyof RetroData, index: number) => {
    setRetroData((prev) => ({
      ...prev,
      [column]: prev[column].filter((_, i) => i !== index),
    }));
  };

  // Save retrospective data
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const response = await apiFetch(
        `/api/sprints/${sprintId}/retrospective`,
        {
          method: "PATCH",
          body: JSON.stringify(retroData),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const error = await response.json();
        setError(
          error.detail || "Failed to save retrospective"
        );
      }
    } catch (err) {
      setError("Error saving retrospective");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Finish retrospective
  const handleFinish = async () => {
    if (
      !window.confirm(
        "Are you sure you want to finish the retrospective? It will no longer be editable."
      )
    ) {
      return;
    }

    try {
      setIsFinishing(true);
      setError(null);

      const response = await apiFetch(
        `/api/sprints/${sprintId}/retrospective/finish`,
        {
          method: "PATCH",
        }
      );

      if (response.ok) {
        setIsFinished(true);
      } else {
        const error = await response.json();
        setError(
          error.detail || "Failed to finish retrospective"
        );
      }
    } catch (err) {
      setError("Error finishing retrospective");
      console.error(err);
    } finally {
      setIsFinishing(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading retrospective...</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Sprint Retrospective</h1>

      {error && <div className={styles.error}>{error}</div>}
      {saveSuccess && (
        <div className={styles.success}>Retrospective saved successfully!</div>
      )}

      {isFinished && (
        <div className={styles.finished}>
          This retrospective is finished and cannot be edited.
        </div>
      )}

      <div className={styles.columnsContainer}>
        <Column
          title="Start Doing"
          items={retroData.start_doing}
          column="start_doing"
          onUpdate={updateItem}
          onAdd={addItem}
          onRemove={removeItem}
          disabled={isFinished}
        />
        <Column
          title="Stop Doing"
          items={retroData.stop_doing}
          column="stop_doing"
          onUpdate={updateItem}
          onAdd={addItem}
          onRemove={removeItem}
          disabled={isFinished}
        />
        <Column
          title="Continue Doing"
          items={retroData.continue_doing}
          column="continue_doing"
          onUpdate={updateItem}
          onAdd={addItem}
          onRemove={removeItem}
          disabled={isFinished}
        />
      </div>

      {!isFinished && (
        <div className={styles.buttonContainer}>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Retrospective"}
          </button>
          <button
            className={styles.finishButton}
            onClick={handleFinish}
            disabled={isFinishing}
          >
            {isFinishing ? "Finishing..." : "Finish Retrospective"}
          </button>
        </div>
      )}
    </div>
  );
}

interface ColumnProps {
  title: string;
  items: string[];
  column: "start_doing" | "stop_doing" | "continue_doing";
  onUpdate: (column: string, index: number, value: string) => void;
  onAdd: (column: string) => void;
  onRemove: (column: string, index: number) => void;
  disabled: boolean;
}

function Column({
  title,
  items,
  column,
  onUpdate,
  onAdd,
  onRemove,
  disabled,
}: ColumnProps) {
  return (
    <div className={styles.column}>
      <h2>{title}</h2>
      <div className={styles.items}>
        {items.map((item, index) => (
          <div key={index} className={styles.itemRow}>
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(column, index, e.target.value)}
              placeholder={`Enter what we should ${title.toLowerCase().slice(0, -6)}`}
              disabled={disabled}
              className={styles.input}
            />
            {!disabled && (
              <button
                className={styles.removeButton}
                onClick={() => onRemove(column, index)}
                title="Remove item"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      {!disabled && (
        <button
          className={styles.addButton}
          onClick={() => onAdd(column)}
        >
          + Add Item
        </button>
      )}
    </div>
  );
}
