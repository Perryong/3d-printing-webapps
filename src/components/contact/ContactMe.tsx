
import React, { useState } from 'react';
import { Mail, Phone, MapPin, Linkedin, Github, Globe, Send } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import FirebaseFileList from './FirebaseFileList';

const contactData = {
  email: "perryong0000@gmail.com",
  phone: "Not Available",
  linkedin: "#",
  github: "#",
  website: "https://perryong.github.io/personal-portfolio/",
  location: "Singapore"
};

// EmailJS configuration with your credentials
const EMAILJS_CONFIG = {
  serviceId: 'service_ngmmxxm',
  templateId: 'template_n46vbft',
  publicKey: 'pJZ6tAZ5dH_Aazb7E'
};

const ContactMe: React.FC = () => {
  const { state } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!formData.subject.trim()) {
      toast.error('Please enter a subject');
      return false;
    }
    if (!formData.message.trim()) {
      toast.error('Please enter a message');
      return false;
    }
    return true;
  };

  const formatFirebaseFilesInfo = () => {
    if (state.uploadedFiles.length === 0) {
      return '';
    }

    const fileInfoList = state.uploadedFiles.map((file, index) => {
      const status = file.firebaseMetadata 
        ? '✅ Stored in cloud' 
        : file.isUploading 
        ? '⏳ Uploading...' 
        : '❌ Upload failed';
      
      const info = [
        `${index + 1}. ${file.name}`,
        `   Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
        `   Status: ${status}`
      ];

      if (file.firebaseMetadata) {
        info.push(`   Cloud URL: ${file.firebaseMetadata.url}`);
        info.push(`   Storage Path: ${file.firebaseMetadata.path}`);
      }

      return info.join('\n');
    }).join('\n\n');

    return `\n\n--- UPLOADED FILES ---\n${fileInfoList}\n--- END FILES ---`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const firebaseFilesInfo = formatFirebaseFilesInfo();
      const emailMessage = formData.message + firebaseFilesInfo;

      // Prepare email data without file attachments
      const emailData = {
        from_name: formData.name,
        from_email: formData.email,
        subject: formData.subject,
        message: emailMessage,
        to_email: contactData.email,
        file_count: state.uploadedFiles.length.toString(),
        has_files: state.uploadedFiles.length > 0 ? 'true' : 'false'
      };

      // Send email using EmailJS
      const result = await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        emailData,
        EMAILJS_CONFIG.publicKey
      );
      
      if (result.status === 200) {
        toast.success('Message sent successfully! I\'ll get back to you soon.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Fallback to mailto on error
      const subject = encodeURIComponent(formData.subject);
      const fileNote = state.uploadedFiles.length > 0 
        ? `\n\nUploaded Files (${state.uploadedFiles.length}):\n${state.uploadedFiles.map(f => `- ${f.name}${f.firebaseMetadata ? ` (Cloud: ${f.firebaseMetadata.url})` : ''}`).join('\n')}`
        : '';
      
      const body = encodeURIComponent(
        `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}${fileNote}`
      );
      const mailtoLink = `mailto:${contactData.email}?subject=${subject}&body=${body}`;
      
      window.open(mailtoLink, '_blank');
      toast.error('Email service unavailable. Opening your email client as backup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Contact Information */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Get In Touch</h2>
          <p className="text-gray-700 mb-8">
            I'm always excited to work on new software engineering projects and explore AI applications. 
            Feel free to reach out if you have any questions about software development, AI/ML, 
            or just want to chat about technology!
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href={`mailto:${contactData.email}`} className="text-blue-600 hover:underline">
                  {contactData.email}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-gray-600">{contactData.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-gray-900">{contactData.location}</p>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Connect With Me</h3>
            <div className="flex gap-4">
              <a
                href={contactData.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white hover:bg-purple-700 transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Send a Message</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              placeholder="What's this about?"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              required
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors resize-vertical"
              placeholder="Tell me about your project or question..."
            />
          </div>

          {/* Firebase Files Information Section */}
          <div className="border-t border-gray-200 pt-6">
            <FirebaseFileList files={state.uploadedFiles} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            <Send className="w-5 h-5" />
            {isSubmitting ? 'Sending...' : `Send Message${state.uploadedFiles.length > 0 ? ` (${state.uploadedFiles.length} file${state.uploadedFiles.length > 1 ? 's' : ''} info)` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactMe;
