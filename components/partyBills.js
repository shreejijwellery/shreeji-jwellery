import React, { useEffect, useState } from 'react';
import { fetchAllItems, fetchAllSections } from '../actions/actions_creators';
import { FaEdit, FaSave, FaTimes, FaTrash, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import moment from 'moment';
import { PAYMENT_STATUS } from '../lib/constants';

export default function PartyBills(props) {
  const { selectedParty } = props;
 
  return (
    <div className="container mx-auto p-4">

      
    </div>
  );
}
