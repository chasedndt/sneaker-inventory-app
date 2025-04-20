// src/components/Expenses/ExpensesTable.tsx
import React, { useState, JSX } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Checkbox,
  TablePagination,
  Menu,
  MenuItem,
  CircularProgress,
  useTheme,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RepeatIcon from '@mui/icons-material/Repeat';
import SortIcon from '@mui/icons-material/Sort';
import LockIcon from '@mui/icons-material/Lock'; // For auth indication
import useFormat from '../../hooks/useFormat'; // Import the formatting hook
import { useAuth } from '../../contexts/AuthContext'; // Import auth context

import { Expense } from '../../models/expenses';

type SortDirection = 'asc' | 'desc';

interface Column {
  id: keyof Expense | 'actions';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any, row?: Expense) => JSX.Element | string | number;
  sortable?: boolean;
}

interface ExpensesTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onViewReceipt?: (expense: Expense) => void;
  loading?: boolean;
  error?: string | null;
  selectedExpenses: number[];
  onSelectExpense: (expenseId: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

const ExpensesTable: React.FC<ExpensesTableProps> = ({
  expenses,
  onEdit,
  onDelete,
  onViewReceipt,
  loading = false,
  error = null,
  selectedExpenses,
  onSelectExpense,
  onSelectAll
}) => {
  const theme = useTheme();
  const { money, date } = useFormat(); // Use the formatting hook
  const { currentUser } = useAuth(); // Get auth state
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [orderBy, setOrderBy] = React.useState<keyof Expense>('expenseDate');
  const [order, setOrder] = React.useState<SortDirection>('desc');
  
  // Action menu state
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [actionMenuExpense, setActionMenuExpense] = React.useState<Expense | null>(null);
  
  // Define table columns with formatting
  const columns: Column[] = [
    {
      id: 'expenseDate',
      label: 'Date',
      minWidth: 100,
      format: (value) => date(value), // Use date formatter
      sortable: true
    },
    {
      id: 'expenseType',
      label: 'Type',
      minWidth: 120,
      format: (value) => (
        <Chip 
          label={value} 
          size="small" 
          sx={{ 
            fontSize: '0.75rem',
            backgroundColor: getExpenseTypeColor(value),
            color: '#fff'
          }} 
        />
      ),
      sortable: true
    },
    {
      id: 'amount',
      label: 'Amount',
      minWidth: 100,
      align: 'right',
      format: (value) => money(value), // Use money formatter
      sortable: true
    },
    {
      id: 'vendor',
      label: 'Vendor',
      minWidth: 150,
      format: (value) => value || '-',
      sortable: true
    },
    {
      id: 'isRecurring',
      label: 'Recurring',
      minWidth: 100,
      align: 'center',
      format: (value, row) => value ? (
        <Tooltip title={`${row?.recurrencePeriod || 'Recurring'}`}>
          <RepeatIcon sx={{ color: theme.palette.info.main }} />
        </Tooltip>
      ) : '-',
      sortable: true
    },
    {
      id: 'notes',
      label: 'Notes',
      minWidth: 200,
      format: (value) => value ? (
        <Tooltip title={value}>
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 200
            }}
          >
            {value}
          </Typography>
        </Tooltip>
      ) : '-',
      sortable: false
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 100,
      align: 'right',
      sortable: false
    }
  ];
  
  // Helper function to get color for expense type
  const getExpenseTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'Shipping': '#4caf50',
      'Packaging': '#2196f3',
      'Platform Fees': '#ff9800',
      'Storage': '#9c27b0',
      'Supplies': '#3f51b5',
      'Software': '#00bcd4',
      'Marketing': '#e91e63',
      'Travel': '#795548',
      'Utilities': '#607d8b',
      'Rent': '#f44336',
      'Insurance': '#8bc34a',
      'Taxes': '#ff5722',
      'Other': '#9e9e9e'
    };
    
    return colorMap[type] || '#9e9e9e'; // Default to grey for unknown types
  };
  
  // Handle sorting
  const handleRequestSort = (property: keyof Expense) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Handle sort function
  const sortFunction = (a: Expense, b: Expense) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    
    if (aValue === bValue) return 0;
    
    if (orderBy === 'amount') {
      return order === 'asc' 
        ? (a.amount - b.amount)
        : (b.amount - a.amount);
    }
    
    if (orderBy === 'expenseDate') {
      return order === 'asc'
        ? new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
        : new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime();
    }
    
    if (orderBy === 'isRecurring') {
      if (order === 'asc') {
        return a.isRecurring ? 1 : -1;
      } else {
        return a.isRecurring ? -1 : 1;
      }
    }
    
    // For string values
    const stringCompare = (aValue?.toString() || '').localeCompare(bValue?.toString() || '');
    return order === 'asc' ? stringCompare : -stringCompare;
  };
  
  // Sort and paginate expenses
  const sortedExpenses = [...expenses].sort(sortFunction);
  const paginatedExpenses = sortedExpenses.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  //// src/components/Expenses/ExpensesTable.tsx (continued)
  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when rows per page changes
  };
  
  // Handle action menu
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, expense: Expense) => {
    // Check authentication before showing menu
    if (!currentUser) {
      return; // Don't open menu if not authenticated
    }
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuExpense(expense);
  };
  
  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
    setActionMenuExpense(null);
  };
  
  // Action handlers
  const handleEdit = () => {
    if (actionMenuExpense) {
      onEdit(actionMenuExpense);
      handleActionMenuClose();
    }
  };
  
  const handleDelete = () => {
    if (actionMenuExpense) {
      onDelete(actionMenuExpense);
      handleActionMenuClose();
    }
  };
  
  const handleViewReceipt = () => {
    if (actionMenuExpense && onViewReceipt) {
      onViewReceipt(actionMenuExpense);
      handleActionMenuClose();
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }
  
  // If not authenticated, show auth required message
  if (!currentUser) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Authentication required to view expenses
        </Alert>
        <Typography variant="body1">
          Please log in to view and manage your expenses.
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ 
      width: '100%',
      overflow: 'hidden',
      bgcolor: theme.palette.background.paper,
      borderRadius: 2,
      boxShadow: theme.shadows[2]
    }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)', width: '100%' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedExpenses.length > 0 && 
                    selectedExpenses.length < expenses.length
                  }
                  checked={
                    expenses.length > 0 && 
                    selectedExpenses.length === expenses.length
                  }
                  onChange={(e) => onSelectAll(e.target.checked)}
                  sx={{
                    color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : undefined,
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              </TableCell>
              
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id as keyof Expense)}
                      sx={{ fontWeight: 'bold' }}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {column.label}
                    </Typography>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {paginatedExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No expenses found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedExpenses.map((expense) => {
                const isSelected = selectedExpenses.includes(expense.id);
                return (
                  <TableRow 
                    hover 
                    key={expense.id}
                    selected={isSelected}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => onSelectExpense(expense.id, e.target.checked)}
                        sx={{
                          color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : undefined,
                          '&.Mui-checked': {
                            color: theme.palette.primary.main,
                          },
                        }}
                      />
                    </TableCell>
                    
                    {columns.map((column) => {
                      if (column.id === 'actions') {
                        return (
                          <TableCell key={column.id} align={column.align}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => onEdit(expense)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              
                              {expense.receiptFilename && onViewReceipt && (
                                <Tooltip title="View Receipt">
                                  <IconButton
                                    size="small"
                                    onClick={() => onViewReceipt(expense)}
                                  >
                                    <ReceiptIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              <Tooltip title="More Options">
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleActionMenuOpen(e, expense)}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        );
                      }
                      
                      const value = expense[column.id as keyof Expense];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.format ? column.format(value, expense) : value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={expenses.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      />
      
      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        
        {actionMenuExpense?.receiptFilename && onViewReceipt && (
          <MenuItem onClick={handleViewReceipt}>
            <ReceiptIcon fontSize="small" sx={{ mr: 1 }} />
            View Receipt
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={handleDelete}
          sx={{ color: theme.palette.error.main }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default ExpensesTable;