import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import {
  CheckCircle,
  XCircle,
  Search,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Calendar,
  DollarSign,
  Shield,
  Car,
  MessageSquare,
  History,
  Eye,
  Download,
} from 'lucide-react';

// Using any type for flexibility with different claim interfaces

interface ApprovalHistory {
  id: number;
  action: string;
  performed_by: string;
  performed_by_email?: string;
  notes?: string;
  approved_amount?: string;
  rejection_reason?: string;
  created_at: string;
}

interface ClaimApprovalDialogProps {
  claim: any | null; // Using any to be flexible with different claim interfaces
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaimApprovalDialog({ claim, isOpen, onClose }: ClaimApprovalDialogProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('approval');
  const [action, setAction] = useState<'approve' | 'reject' | 'investigate' | 'under_review'>('approve');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [priority, setPriority] = useState(claim?.priority || 'medium');
  const [requiresInvestigation, setRequiresInvestigation] = useState(false);
  const [investigationNotes, setInvestigationNotes] = useState('');

  // Reset form when claim changes
  React.useEffect(() => {
    if (claim) {
      setApprovedAmount(claim.estimated_amount);
      setPriority(claim.priority || 'medium');
      setNotes('');
      setRejectionReason('');
      setInvestigationNotes('');
      setRequiresInvestigation(false);
    }
  }, [claim]);

  // Fetch approval history
  const { data: approvalHistory = [] } = useQuery<ApprovalHistory[]>({
    queryKey: ['claim-approval-history', claim?.id],
    queryFn: () => apiFetch(`/api/claims/${claim?.id}/approval_history/`),
    enabled: !!claim?.id,
  });

  // Process claim mutation
  const processClaimMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiFetch(`/api/claims/${claim?.id}/process_claim/`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] });
      qc.invalidateQueries({ queryKey: ['claim-approval-history', claim?.id] });
      toast.success('Claim processed successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process claim');
    },
  });

  // Guard clause to prevent errors when claim is null
  if (!claim) {
    return null;
  }

  const handleSubmit = () => {
    if (!claim) return;

    const data: any = {
      action,
      priority,
      notes,
      requires_investigation: requiresInvestigation,
      investigation_notes: investigationNotes,
    };

    if (action === 'approve') {
      if (!approvedAmount) {
        toast.error('Approved amount is required');
        return;
      }
      data.approved_amount = approvedAmount;
    } else if (action === 'reject') {
      if (!rejectionReason) {
        toast.error('Rejection reason is required');
        return;
      }
      data.rejection_reason = rejectionReason;
    }

    processClaimMutation.mutate(data);
  };

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'under_review': return 'secondary';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'under_review': return <Clock className="w-4 h-4" />;
      case 'investigate': return <Search className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (!claim) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Claim Approval - {claim.claim_id}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Claim Details</TabsTrigger>
              <TabsTrigger value="approval">Approval</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <div className="mt-4 h-[calc(100%-60px)] overflow-hidden">
              <TabsContent value="details" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-6">
                    {/* Claim Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Claim Overview</span>
                          <div className="flex gap-2">
                            <Badge variant={getPriorityColor(claim.priority)}>
                              {(claim.priority || 'medium').toUpperCase()}
                            </Badge>
                            <Badge variant={getStatusColor(claim.approval_status)}>
                              {(claim.approval_status || 'pending').replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Claim ID</Label>
                            <p className="font-medium">{claim.claim_id}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Policy Number</Label>
                            <p className="font-medium">{claim.policy?.policy_number || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Incident Date</Label>
                            <p className="font-medium">{new Date(claim.incident_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Claim Date</Label>
                            <p className="font-medium">{new Date(claim.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Customer Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Customer Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Customer Name</Label>
                            <p className="font-medium">
                              {claim.policy?.customer?.user?.first_name || ''} {claim.policy?.customer?.user?.last_name || ''}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                            <p className="font-medium">{claim.policy?.customer?.user?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Vehicle Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Car className="w-4 h-4" />
                          Vehicle Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Vehicle Number</Label>
                            <p className="font-medium">{claim.policy?.vehicle?.vehicle_number || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Make & Model</Label>
                            <p className="font-medium">
                              {claim.policy?.vehicle?.year || ''} {claim.policy?.vehicle?.make || ''} {claim.policy?.vehicle?.model || ''}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Claim Description */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Claim Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed">{claim.description}</p>
                      </CardContent>
                    </Card>

                    {/* Financial Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Financial Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Estimated Amount</Label>
                            <p className="font-medium text-lg">${parseFloat(claim.estimated_amount).toLocaleString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Approved Amount</Label>
                            <p className="font-medium text-lg text-green-600">
                              {claim.approved_amount ? `$${parseFloat(claim.approved_amount).toLocaleString()}` : 'Not approved'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="approval" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-6">
                    {/* Approval Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Approval Decision</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Action</Label>
                          <Select value={action} onValueChange={(value: any) => setAction(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="approve">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  Approve Claim
                                </div>
                              </SelectItem>
                              <SelectItem value="reject">
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-red-600" />
                                  Reject Claim
                                </div>
                              </SelectItem>
                              <SelectItem value="investigate">
                                <div className="flex items-center gap-2">
                                  <Search className="w-4 h-4 text-orange-600" />
                                  Require Investigation
                                </div>
                              </SelectItem>
                              <SelectItem value="under_review">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-blue-600" />
                                  Mark Under Review
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Priority</Label>
                          <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {action === 'approve' && (
                          <div>
                            <Label htmlFor="approved-amount">Approved Amount</Label>
                            <Input
                              id="approved-amount"
                              type="number"
                              value={approvedAmount}
                              onChange={(e) => setApprovedAmount(e.target.value)}
                              placeholder="Enter approved amount"
                            />
                          </div>
                        )}

                        {action === 'reject' && (
                          <div>
                            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                            <Textarea
                              id="rejection-reason"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Enter reason for rejection"
                              rows={3}
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Enter any additional notes"
                            rows={3}
                          />
                        </div>

                        {action === 'investigate' && (
                          <div>
                            <Label htmlFor="investigation-notes">Investigation Notes</Label>
                            <Textarea
                              id="investigation-notes"
                              value={investigationNotes}
                              onChange={(e) => setInvestigationNotes(e.target.value)}
                              placeholder="Enter investigation requirements and notes"
                              rows={3}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="documents" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {claim.documents && claim.documents.length > 0 ? (
                      claim.documents.map((doc) => (
                        <Card key={doc.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">{doc.document_type}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No documents uploaded for this claim</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="h-full">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {approvalHistory.length > 0 ? (
                      approvalHistory.map((record) => (
                        <Card key={record.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                {getActionIcon(record.action)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium capitalize">
                                    {record.action.replace('_', ' ')}
                                  </h4>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(record.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  by {record.performed_by}
                                </p>
                                {record.notes && (
                                  <p className="text-sm mb-2">{record.notes}</p>
                                )}
                                {record.approved_amount && (
                                  <p className="text-sm text-green-600 font-medium">
                                    Approved Amount: ${parseFloat(record.approved_amount).toLocaleString()}
                                  </p>
                                )}
                                {record.rejection_reason && (
                                  <p className="text-sm text-red-600">
                                    Reason: {record.rejection_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No approval history available</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={processClaimMutation.isPending}
            variant={action === 'approve' ? 'default' : action === 'reject' ? 'destructive' : 'secondary'}
          >
            {processClaimMutation.isPending ? 'Processing...' : `Process ${action}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
