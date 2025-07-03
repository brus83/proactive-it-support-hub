
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, User, ArrowRight } from "lucide-react";
import { workflowService, WorkflowExecution } from "@/services/workflowService";
import { useAuth } from "@/hooks/useAuth";

interface WorkflowWidgetProps {
  ticketId: string;
}

const WorkflowWidget = ({ ticketId }: WorkflowWidgetProps) => {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    loadWorkflowExecution();
  }, [ticketId]);

  const loadWorkflowExecution = async () => {
    try {
      const data = await workflowService.getWorkflowExecution(ticketId);
      setExecution(data);
    } catch (error) {
      console.error('Error loading workflow execution:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStep = async () => {
    if (!execution) return;

    try {
      await workflowService.advanceWorkflowStep(execution.id);
      await loadWorkflowExecution();
    } catch (error) {
      console.error('Error advancing workflow step:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!execution || !execution.workflow) {
    return null;
  }

  const { workflow } = execution;
  const currentStep = workflow.steps[execution.current_step];
  const progress = ((execution.current_step + 1) / workflow.steps.length) * 100;
  const isCompleted = execution.status === 'completed';
  const canAdvance = profile?.role === 'admin' || profile?.role === 'technician';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Workflow: {workflow.name}</span>
          <Badge variant={isCompleted ? "default" : "secondary"}>
            {isCompleted ? 'Completato' : 'In corso'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progresso</span>
            <span>{execution.current_step + 1} di {workflow.steps.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-3">
          {workflow.steps.map((step, index) => {
            const isCurrentStep = index === execution.current_step;
            const isCompleted = index < execution.current_step;
            const isPending = index > execution.current_step;

            return (
              <div
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  isCurrentStep ? 'border-primary bg-primary/5' : 
                  isCompleted ? 'border-green-200 bg-green-50' : 
                  'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : isCurrentStep ? (
                    <Clock className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${isCurrentStep ? 'text-primary' : ''}`}>
                      {step.name}
                    </h4>
                    {step.role && (
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        {step.role}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {!isCompleted && canAdvance && currentStep && (
          <div className="pt-4 border-t">
            <Button 
              onClick={handleAdvanceStep}
              className="w-full"
            >
              Completa Step: {currentStep.name}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowWidget;
